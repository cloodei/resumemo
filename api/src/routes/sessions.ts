import { randomUUIDv7 } from "bun";
import { Elysia, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILES_PER_SESSION } from "@shared/constants/file-uploads";

import { db } from "~/lib/db";
import { authMiddleware } from "~/lib/auth";
import { publishPipelineJob, type PipelineJobPayload } from "~/lib/queue";
import { validateFileMetadata } from "~/lib/upload-guard";
import {
	deleteFile,
	generatePresignedUploadUrl,
	generateStorageKey,
	headFile,
} from "~/lib/storage";

type ConfirmedUpload = {
	storageKey: string;
	fileName: string;
	mimeType: string;
	size: number;
};

type SessionFileRecord = {
	fileId: number;
	storageKey: string;
	originalName: string;
	mimeType: string;
	size: bigint;
};

async function cleanupUploadedKeys(storageKeys: string[]) {
	await Promise.all(storageKeys.map(async (storageKey) => {
		try {
			await deleteFile(storageKey);
		}
		catch {
			// Best-effort cleanup.
		}
	}));
}

function buildResultWhere(sessionId: string, activeRunId: string | null) {
	if (activeRunId) {
		return and(
			eq(schema.candidateResult.sessionId, sessionId),
			eq(schema.candidateResult.runId, activeRunId),
		);
	}

	return eq(schema.candidateResult.sessionId, sessionId);
}

function buildPipelinePayload(args: {
	sessionId: string;
	runId: string;
	jobDescription: string;
	files: SessionFileRecord[];
}): PipelineJobPayload {
	return {
		session_id: args.sessionId,
		run_id: args.runId,
		job_description: args.jobDescription,
		files: args.files.map(file => ({
			file_id: file.fileId,
			storage_key: file.storageKey,
			original_name: file.originalName,
		})),
	};
}

async function markSessionQueueFailure(sessionId: string, errorMessage: string) {
	await db
		.update(schema.profilingSession)
		.set({
			status: "failed",
			errorMessage,
		})
		.where(eq(schema.profilingSession.id, sessionId));
}

async function publishSessionRun(args: {
	sessionId: string;
	runId: string;
	jobDescription: string;
	files: SessionFileRecord[];
}) {
	try {
		await publishPipelineJob(buildPipelinePayload(args));
	}
	catch (error) {
		await markSessionQueueFailure(
			args.sessionId,
			error instanceof Error ? error.message : "Failed to publish to queue",
		);
		throw error;
	}
}

async function verifyUploads(files: ConfirmedUpload[]) {
	const headResults = await Promise.all(
		files.map(async (file) => {
			try {
				const head = await headFile(file.storageKey);
				const size = head.ContentLength ?? 0;
				const mimeType = head.ContentType ?? "bad";
				const check = validateFileMetadata({
					fileName: file.fileName,
					claimedMimeType: mimeType,
					size,
				});

				if (!check.ok)
					return { storageKey: file.storageKey, reason: check.message };

				return null;
			}
			catch {
				return {
					storageKey: file.storageKey,
					reason: "Uploaded object is missing or unreadable",
				};
			}
		}),
	);

	return headResults.filter(
		(result): result is { storageKey: string; reason: string } => result !== null,
	);
}

async function getSessionUploads(sessionId: string) {
	const files = await db
		.select({
			storageKey: schema.resumeFile.storageKey,
			fileName: schema.resumeFile.originalName,
			mimeType: schema.resumeFile.mimeType,
			size: schema.resumeFile.size,
		})
		.from(schema.profilingSessionFile)
		.innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
		.where(eq(schema.profilingSessionFile.sessionId, sessionId));

	return files.map(file => ({
		storageKey: file.storageKey,
		fileName: file.fileName,
		mimeType: file.mimeType,
		size: Number(file.size),
	}));
}

async function attachExistingFilesToSession(args: {
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
	sessionId: string;
	userId: string;
	files: ConfirmedUpload[];
}) {
	const storageKeys = args.files.map(file => file.storageKey);
	const existingFiles = await args.tx
		.select({
			fileId: schema.resumeFile.id,
			storageKey: schema.resumeFile.storageKey,
			originalName: schema.resumeFile.originalName,
			mimeType: schema.resumeFile.mimeType,
			size: schema.resumeFile.size,
		})
		.from(schema.resumeFile)
		.where(and(
			eq(schema.resumeFile.userId, args.userId),
			inArray(schema.resumeFile.storageKey, storageKeys),
		));

	const fileByStorageKey = new Map(existingFiles.map(file => [file.storageKey, file]));
	const missingUploads = args.files.filter(file => !fileByStorageKey.has(file.storageKey));

	if (missingUploads.length > 0) {
		const insertedFiles = await args.tx
			.insert(schema.resumeFile)
			.values(missingUploads.map(file => ({
				userId: args.userId,
				originalName: file.fileName,
				mimeType: file.mimeType,
				size: BigInt(file.size),
				storageKey: file.storageKey,
			})))
			.returning({
				fileId: schema.resumeFile.id,
				storageKey: schema.resumeFile.storageKey,
				originalName: schema.resumeFile.originalName,
				mimeType: schema.resumeFile.mimeType,
				size: schema.resumeFile.size,
			});

		for (const file of insertedFiles)
			fileByStorageKey.set(file.storageKey, file);
	}

	const sessionFiles = args.files.map((file) => {
		const matched = fileByStorageKey.get(file.storageKey);
		if (!matched)
			throw new Error(`Missing stored file for ${file.fileName}`);

		return matched;
	});

	await args.tx.insert(schema.profilingSessionFile).values(
		sessionFiles.map(file => ({
			sessionId: args.sessionId,
			fileId: file.fileId,
		})),
	);

	return sessionFiles;
}

async function getSessionFileRecords(sessionId: string) {
	return db
		.select({
			fileId: schema.resumeFile.id,
			storageKey: schema.resumeFile.storageKey,
			originalName: schema.resumeFile.originalName,
			mimeType: schema.resumeFile.mimeType,
			size: schema.resumeFile.size,
		})
		.from(schema.profilingSessionFile)
		.innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
		.where(eq(schema.profilingSessionFile.sessionId, sessionId));
}

async function createSessionWithFiles(args: {
	userId: string;
	name: string;
	jobTitle?: string | null;
	jobDescription: string;
	files: ConfirmedUpload[];
}) {
	const runId = randomUUIDv7();
	let sessionId = "";
	let sessionFiles: SessionFileRecord[] = [];

	await db.transaction(async (tx) => {
		const [createdSession] = await tx
			.insert(schema.profilingSession)
			.values({
				userId: args.userId,
				name: args.name,
				jobDescription: args.jobDescription,
				jobTitle: args.jobTitle ?? null,
				status: "processing",
				activeRunId: runId,
				totalFiles: args.files.length,
				errorMessage: null,
				lastCompletedAt: null,
			})
			.returning({ id: schema.profilingSession.id });

		sessionId = createdSession.id;

		sessionFiles = await attachExistingFilesToSession({
			tx,
			sessionId,
			userId: args.userId,
			files: args.files,
		});
	});

	try {
		await publishSessionRun({
			sessionId,
			runId,
			jobDescription: args.jobDescription,
			files: sessionFiles,
		});
	}
	catch (error) {
		await db.delete(schema.profilingSession).where(eq(schema.profilingSession.id, sessionId));
		throw error;
	}

	return {
		status: "processing" as const,
		sessionId,
		runId,
		totalConfirmed: args.files.length,
	};
}

async function rerunSession(args: {
	sessionId: string;
	name: string;
	jobTitle?: string | null;
	jobDescription: string;
	status: "retrying";
}) {
	const runId = randomUUIDv7();
	const files = await getSessionFileRecords(args.sessionId);

	if (files.length === 0)
		throw new Error("No files found for this session");

	await db
		.update(schema.profilingSession)
		.set({
			name: args.name,
			jobTitle: args.jobTitle ?? null,
			jobDescription: args.jobDescription,
			status: args.status,
			activeRunId: runId,
			errorMessage: null,
			lastCompletedAt: null,
			totalFiles: files.length,
		})
		.where(eq(schema.profilingSession.id, args.sessionId));

	await publishSessionRun({
		sessionId: args.sessionId,
		runId,
		jobDescription: args.jobDescription,
		files,
	});

	return {
		status: args.status,
		sessionId: args.sessionId,
		runId,
		totalConfirmed: files.length,
	};
}

export const sessionRoutes = new Elysia({ prefix: "/api/v2/sessions" })
	.use(authMiddleware)
	.post(
		"/presign",
		async ({ user, body, status }) => {
			const { files } = body;

			const distinctClientIds = new Set(files.map(file => file.clientId));
			if (distinctClientIds.size !== files.length) {
				return status(400, {
					status: "error",
					message: "Each file must have a unique clientId",
					errors: null,
				});
			}

			const metadataErrors = files
				.map((file) => {
					const check = validateFileMetadata({
						fileName: file.fileName,
						claimedMimeType: file.mimeType,
						size: file.size,
					});
					if (check.ok)
						return null;

					return {
						clientId: file.clientId,
						reason: check.message,
					};
				})
				.filter(issue => issue !== null);

			if (metadataErrors.length > 0) {
				return status(400, {
					status: "error",
					message: "Metadata validation failed",
					errors: metadataErrors,
				});
			}

			const uploads = await Promise.all(
				files.map(async (file) => {
					const storageKey = generateStorageKey(user.id, file.fileName);
					return {
						clientId: file.clientId,
						storageKey,
						uploadUrl: await generatePresignedUploadUrl(storageKey, file.mimeType, file.size),
					};
				}),
			);

			return { status: "ok", uploads };
		},
		{
			auth: true,
			body: t.Object({
				files: t.Array(
					t.Object({
						clientId: t.Number(),
						fileName: t.String({ minLength: 1, maxLength: 512 }),
						mimeType: t.String({ minLength: 1, maxLength: 128 }),
						size: t.Number({ minimum: 1 }),
					}),
					{ minItems: 1, maxItems: MAX_FILES_PER_SESSION },
				),
			}),
		},
	)
	.post(
		"/create",
		async ({ user, body, status }) => {
			const { name, jobDescription, jobTitle, files } = body;

			if (files.length === 0) {
				return status(400, {
					status: "error",
					message: "At least one file is required",
				});
			}

			for (const file of files) {
				if (!file.storageKey.startsWith(`${user.id}/`)) {
					return status(403, {
						status: "error",
						message: "Storage key does not belong to this user",
					});
				}
			}

			const failures = await verifyUploads(files);

			if (failures.length > 0) {
				await cleanupUploadedKeys(files.map(file => file.storageKey));

				return status(400, {
					status: "error",
					message: "Upload verification failed",
					failures,
				});
			}

			try {
				return await createSessionWithFiles({
					userId: user.id,
					name,
					jobTitle,
					jobDescription,
					files,
				});
			}
			catch {
				return status(500, {
					status: "error",
					message: "Failed to submit job to processing queue",
				});
			}
		},
		{
			auth: true,
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 255 }),
				jobDescription: t.String({ minLength: 1, maxLength: 5000 }),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
				files: t.Array(
					t.Object({
						storageKey: t.String({ minLength: 1 }),
						fileName: t.String({ minLength: 1, maxLength: 512 }),
						mimeType: t.String({ minLength: 1, maxLength: 128 }),
						size: t.Number({ minimum: 1 }),
					}),
					{ minItems: 1, maxItems: MAX_FILES_PER_SESSION },
				),
			}),
		},
	)
	.post(
		"/:id/retry",
		async ({ user, params, body, status }) => {
			const [existingSession] = await db
				.select({
					id: schema.profilingSession.id,
					name: schema.profilingSession.name,
					jobTitle: schema.profilingSession.jobTitle,
					jobDescription: schema.profilingSession.jobDescription,
					status: schema.profilingSession.status,
				})
				.from(schema.profilingSession)
				.where(
					and(
						eq(schema.profilingSession.id, params.id),
						eq(schema.profilingSession.userId, user.id),
					),
				);

			if (!existingSession)
				return status(404, { status: "error", message: "Session not found" });

			if (existingSession.status === "processing" || existingSession.status === "retrying") {
				return status(409, {
					status: "error",
					message: "This session is already running",
				});
			}

			const uploads = await getSessionUploads(existingSession.id);
			if (uploads.length === 0) {
				return status(404, {
					status: "error",
					message: "Files not found for this session",
				});
			}

			const reusableFailures = await verifyUploads(uploads);
			if (reusableFailures.length > 0) {
				return status(409, {
					status: "error",
					message: "Some existing uploads are no longer reusable",
					failures: reusableFailures,
				});
			}

			const nextName = body.name?.trim() || existingSession.name;
			const nextJobTitle = body.jobTitle !== undefined
				? body.jobTitle.trim() || null
				: existingSession.jobTitle;
			const nextJobDescription = body.jobDescription?.trim() || existingSession.jobDescription;

			try {
				switch (body.mode) {
					case "rerun_current": {
						const retried = await rerunSession({
							sessionId: existingSession.id,
							name: existingSession.name,
							jobTitle: existingSession.jobTitle,
							jobDescription: existingSession.jobDescription,
							status: "retrying",
						});

						return {
							...retried,
							action: "rerun_current",
							targetSessionId: existingSession.id,
						};
					}

					case "clone_current": {
						const created = await createSessionWithFiles({
							userId: user.id,
							name: existingSession.name,
							jobTitle: existingSession.jobTitle,
							jobDescription: existingSession.jobDescription,
							files: uploads,
						});

						return {
							...created,
							action: "clone_current",
							targetSessionId: created.sessionId,
						};
					}

					case "clone_with_updates": {
						const created = await createSessionWithFiles({
							userId: user.id,
							name: nextName,
							jobTitle: nextJobTitle,
							jobDescription: nextJobDescription,
							files: uploads,
						});

						return {
							...created,
							action: "clone_with_updates",
							targetSessionId: created.sessionId,
						};
					}

					case "replace_with_updates": {
						const retried = await rerunSession({
							sessionId: existingSession.id,
							name: nextName,
							jobTitle: nextJobTitle,
							jobDescription: nextJobDescription,
							status: "retrying",
						});

						return {
							...retried,
							action: "replace_with_updates",
							targetSessionId: existingSession.id,
						};
					}
				}
			}
			catch {
				return status(500, {
					status: "error",
					message: "Failed to start the selected retry flow",
				});
			}
		},
		{
			auth: true,
			body: t.Object({
				mode: t.Union([
					t.Literal("rerun_current"),
					t.Literal("clone_current"),
					t.Literal("clone_with_updates"),
					t.Literal("replace_with_updates"),
				]),
				name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
				jobDescription: t.Optional(t.String({ minLength: 1, maxLength: 5000 })),
			}),
		},
	)
	.get(
		"/",
		async ({ user }) => {
			const sessions = await db
				.select()
				.from(schema.profilingSession)
				.where(eq(schema.profilingSession.userId, user.id))
				.orderBy(desc(schema.profilingSession.createdAt));

			return { sessions };
		},
		{ auth: true },
	)
	.get(
		"/:id",
		async ({ user, params, status }) => {
			const [sessionRows, files] = await Promise.all([
				db
					.select()
					.from(schema.profilingSession)
					.where(
						and(
							eq(schema.profilingSession.id, params.id),
							eq(schema.profilingSession.userId, user.id),
						),
					),
				db
					.select({
						id: schema.resumeFile.id,
						originalName: schema.resumeFile.originalName,
						mimeType: schema.resumeFile.mimeType,
						size: schema.resumeFile.size,
					})
					.from(schema.profilingSessionFile)
					.innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
					.where(eq(schema.profilingSessionFile.sessionId, params.id)),
			]);

			const session = sessionRows[0];
			if (!session)
				return status(404, { status: "error", message: "Session not found" });

			if (files.length === 0)
				return status(404, { status: "error", message: "Files not found" });

			let results: unknown[] | null = null;
			if (session.status === "completed") {
				results = await db
					.select({
						id: schema.candidateResult.id,
						runId: schema.candidateResult.runId,
						fileId: schema.candidateResult.fileId,
						candidateName: schema.candidateResult.candidateName,
						candidateEmail: schema.candidateResult.candidateEmail,
						candidatePhone: schema.candidateResult.candidatePhone,
						parsedProfile: schema.candidateResult.parsedProfile,
						overallScore: schema.candidateResult.overallScore,
						summary: schema.candidateResult.summary,
						skillsMatched: schema.candidateResult.skillsMatched,
						createdAt: schema.candidateResult.createdAt,
						originalName: schema.resumeFile.originalName,
					})
					.from(schema.candidateResult)
					.innerJoin(schema.resumeFile, eq(schema.candidateResult.fileId, schema.resumeFile.id))
					.where(buildResultWhere(params.id, session.activeRunId ?? null))
					.orderBy(desc(schema.candidateResult.overallScore));
			}

			return {
				session,
				files: files.map(file => ({
					id: file.id,
					originalName: file.originalName,
					mimeType: file.mimeType,
					size: Number(file.size),
				})),
				results,
			};
		},
		{ auth: true },
	)
	.get(
		"/:id/results",
		async ({ user, params, status, query }) => {
			const sortDir = query.sort === "asc"
				? schema.candidateResult.overallScore
				: desc(schema.candidateResult.overallScore);

			const [sessionRows, results] = await Promise.all([
				db
					.select({
						id: schema.profilingSession.id,
						status: schema.profilingSession.status,
						activeRunId: schema.profilingSession.activeRunId,
					})
					.from(schema.profilingSession)
					.where(
						and(
							eq(schema.profilingSession.id, params.id),
							eq(schema.profilingSession.userId, user.id),
						),
					),
				db
					.select({
						id: schema.candidateResult.id,
						runId: schema.candidateResult.runId,
						fileId: schema.candidateResult.fileId,
						candidateName: schema.candidateResult.candidateName,
						candidateEmail: schema.candidateResult.candidateEmail,
						candidatePhone: schema.candidateResult.candidatePhone,
						parsedProfile: schema.candidateResult.parsedProfile,
						overallScore: schema.candidateResult.overallScore,
						summary: schema.candidateResult.summary,
						skillsMatched: schema.candidateResult.skillsMatched,
						createdAt: schema.candidateResult.createdAt,
						originalName: schema.resumeFile.originalName,
					})
					.from(schema.candidateResult)
					.innerJoin(schema.resumeFile, eq(schema.candidateResult.fileId, schema.resumeFile.id))
					.where(eq(schema.candidateResult.sessionId, params.id))
					.orderBy(sortDir),
			]);

			const session = sessionRows[0];
			if (!session)
				return status(404, { status: "error", message: "Session not found" });

			const filteredResults = results.filter(result => !session.activeRunId || result.runId === session.activeRunId);

			return {
				sessionId: params.id,
				sessionStatus: session.status,
				totalResults: filteredResults.length,
				results: filteredResults,
			};
		},
		{
			auth: true,
			query: t.Object({
				sort: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
			}),
		},
	)
	.get(
		"/:id/results/:resultId",
		async ({ user, params, status }) => {
			const [sessionRows, resultRows] = await Promise.all([
				db
					.select({
						id: schema.profilingSession.id,
						activeRunId: schema.profilingSession.activeRunId,
					})
					.from(schema.profilingSession)
					.where(
						and(
							eq(schema.profilingSession.id, params.id),
							eq(schema.profilingSession.userId, user.id),
						),
					),
				db
					.select({
						id: schema.candidateResult.id,
						runId: schema.candidateResult.runId,
						sessionId: schema.candidateResult.sessionId,
						fileId: schema.candidateResult.fileId,
						candidateName: schema.candidateResult.candidateName,
						candidateEmail: schema.candidateResult.candidateEmail,
						candidatePhone: schema.candidateResult.candidatePhone,
						rawText: schema.candidateResult.rawText,
						parsedProfile: schema.candidateResult.parsedProfile,
						overallScore: schema.candidateResult.overallScore,
						scoreBreakdown: schema.candidateResult.scoreBreakdown,
						summary: schema.candidateResult.summary,
						skillsMatched: schema.candidateResult.skillsMatched,
						createdAt: schema.candidateResult.createdAt,
						originalName: schema.resumeFile.originalName,
						mimeType: schema.resumeFile.mimeType,
					})
					.from(schema.candidateResult)
					.innerJoin(schema.resumeFile, eq(schema.candidateResult.fileId, schema.resumeFile.id))
					.where(
						and(
							eq(schema.candidateResult.id, params.resultId),
							eq(schema.candidateResult.sessionId, params.id),
						),
					),
			]);

			const session = sessionRows[0];
			if (!session)
				return status(404, { status: "error", message: "Session not found" });

			const result = resultRows.find(row => !session.activeRunId || row.runId === session.activeRunId);
			if (!result)
				return status(404, { status: "error", message: "Result not found" });

			return { result };
		},
		{ auth: true },
	)
	.get(
		"/:id/export",
		async ({ user, params, status, query, set }) => {
			const [sessionRows, results] = await Promise.all([
				db
					.select({
						id: schema.profilingSession.id,
						name: schema.profilingSession.name,
						status: schema.profilingSession.status,
						activeRunId: schema.profilingSession.activeRunId,
					})
					.from(schema.profilingSession)
					.where(
						and(
							eq(schema.profilingSession.id, params.id),
							eq(schema.profilingSession.userId, user.id),
						),
					),
				db
					.select({
						runId: schema.candidateResult.runId,
						candidateName: schema.candidateResult.candidateName,
						candidateEmail: schema.candidateResult.candidateEmail,
						candidatePhone: schema.candidateResult.candidatePhone,
						parsedProfile: schema.candidateResult.parsedProfile,
						overallScore: schema.candidateResult.overallScore,
						summary: schema.candidateResult.summary,
						skillsMatched: schema.candidateResult.skillsMatched,
						originalName: schema.resumeFile.originalName,
					})
					.from(schema.candidateResult)
					.innerJoin(schema.resumeFile, eq(schema.candidateResult.fileId, schema.resumeFile.id))
					.where(eq(schema.candidateResult.sessionId, params.id))
					.orderBy(desc(schema.candidateResult.overallScore)),
			]);

			const session = sessionRows[0];
			if (!session)
				return status(404, { status: "error", message: "Session not found" });
			if (session.status !== "completed")
				return status(409, { status: "error", message: "Session is not completed yet" });

			const filteredResults = results.filter(result => !session.activeRunId || result.runId === session.activeRunId);
			const format = query.format ?? "json";

			if (format === "csv") {
				const csvHeaders = [
					"Rank",
					"Candidate",
					"Email",
					"Phone",
					"Match Score",
					"Summary",
					"Top Skills",
					"Experience",
					"Resume File",
				];

				const csvRows = filteredResults.map((result, index) => [
					String(index + 1),
					escapeCsv(buildDisplayName(result.candidateName, result.originalName, result.parsedProfile)),
					escapeCsv(result.candidateEmail ?? ""),
					escapeCsv(result.candidatePhone ?? ""),
					String(result.overallScore),
					escapeCsv(stripMarkup(result.summary)),
					escapeCsv(Array.isArray(result.skillsMatched) ? result.skillsMatched.join("; ") : ""),
					escapeCsv(getExperienceLabel(result.parsedProfile)),
					escapeCsv(result.originalName),
				].join(","));

				const csv = [csvHeaders.join(","), ...csvRows].join("\n");
				const safeName = session.name.replace(/[^a-zA-Z0-9_-]/g, "_");

				set.headers["content-type"] = "text/csv; charset=utf-8";
				set.headers["content-disposition"] = `attachment; filename="${safeName}-results.csv"`;

				return csv;
			}

			return {
				sessionId: session.id,
				sessionName: session.name,
				exportedAt: new Date().toISOString(),
				totalResults: filteredResults.length,
				results: filteredResults.map((result, index) => ({
					rank: index + 1,
					...result,
				})),
			};
		},
		{
			auth: true,
			query: t.Object({
				format: t.Optional(t.Union([t.Literal("json"), t.Literal("csv")])),
			}),
		},
	);

function escapeCsv(value: string) {
	if (value.includes(",") || value.includes('"') || value.includes("\n"))
		return `"${value.replace(/"/g, '""')}"`;

	return value;
}

function buildDisplayName(candidateName: string | null, originalName: string, parsedProfile: unknown) {
	const confidence = Number((parsedProfile as { name_confidence?: number } | null)?.name_confidence ?? 0);
	if (candidateName && confidence >= 0.5)
		return candidateName;

	return originalName;
}

function getExperienceLabel(parsedProfile: unknown) {
	const years = (parsedProfile as { total_experience_years?: number } | null)?.total_experience_years;
	if (typeof years !== "number")
		return "";

	return `${years} year${years === 1 ? "" : "s"}`;
}

function stripMarkup(value: string) {
	return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
