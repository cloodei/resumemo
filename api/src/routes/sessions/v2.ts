import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILES_PER_SESSION } from "@shared/constants/file-uploads";

import { db } from "~/lib/db";
import { authMiddleware } from "~/lib/auth";
import { publishPipelineJob } from "~/lib/queue";
import { validateFileMetadata } from "~/lib/upload-guard";
import {
	deleteFile,
	generatePresignedUploadUrl,
	generateStorageKey,
	headFile,
} from "~/lib/storage";

const PIPELINE_VERSION = "0.1.0";

async function cleanupUploadedKeys(storageKeys: string[]) {
	await Promise.all(storageKeys.map(async (storageKey) => {
		try { await deleteFile(storageKey) }
		catch { /* Best-effort cleanup */ }
	}));
}

export const sessionRoutes = new Elysia({ prefix: "/api/v2/sessions" })
	.use(authMiddleware)

	.post(
		"/presign",
		async ({ user, body, status }) => {
			const { files } = body;

			const distinctClientIds = new Set(files.map((file) => file.clientId));
			if (distinctClientIds.size !== files.length) {
				return status(400, {
					status: "error",
					message: "Each file must have a unique clientId",
					errors: null
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
				.filter((issue) => issue !== null);

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
						uploadUrl: await generatePresignedUploadUrl(
							storageKey,
							file.mimeType,
							file.size,
						),
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
					message: "At least one file is required"
				});
			}

			// Verify every storageKey belongs to this user (keys are userId/…)
			for (const file of files) {
				if (!file.storageKey.startsWith(`${user.id}/`)) {
					return status(403, {
						status: "error",
						message: "Storage key does not belong to this user"
					});
				}
			}

			// HEAD-check all files in R2 concurrently
			const headResults = await Promise.all(
				files.map(async (file) => {
					try {
						const head = await headFile(file.storageKey);
						const size = Number(head.ContentLength ?? 0);
						const mimeType = head.ContentType ?? file.mimeType;
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

			const failures = headResults.filter(
				(r): r is { storageKey: string; reason: string } => r !== null,
			);

			if (failures.length > 0) {
				await cleanupUploadedKeys(files.map((f) => f.storageKey));

				return status(400, {
					status: "error",
					message: "Upload verification failed",
					failures,
				});
			}

		let sessionId = "", sessionFiles: {
			fileId: number;
			storageKey: string;
			originalName: string;
			mimeType: string;
			size: bigint;
		}[] = [];

		await db.transaction(async (tx) => {
			const [createdSession] = await tx.insert(schema.profilingSession)
				.values({
					userId: user.id,
					name,
					jobDescription,
					jobTitle,
					status: "processing",
					pipelineVersion: PIPELINE_VERSION,
					totalFiles: files.length,
				})
				.returning({ id: schema.profilingSession.id });

			sessionId = createdSession.id;

			sessionFiles = await tx.insert(schema.resumeFile)
				.values(
					files.map((file) => ({
						userId: user.id,
						sessionId,
						originalName: file.fileName,
						mimeType: file.mimeType,
						size: BigInt(file.size),
						storageKey: file.storageKey,
					})),
				)
				.returning({
					fileId: schema.resumeFile.id,
					storageKey: schema.resumeFile.storageKey,
					originalName: schema.resumeFile.originalName,
					mimeType: schema.resumeFile.mimeType,
					size: schema.resumeFile.size,
				});
		});

		// Query inserted files to get their IDs for the pipeline payload
		// const sessionFiles = await db
		// 	.select({
		// 		fileId: schema.resumeFile.id,
		// 		storageKey: schema.resumeFile.storageKey,
		// 		originalName: schema.resumeFile.originalName,
		// 		mimeType: schema.resumeFile.mimeType,
		// 		size: schema.resumeFile.size,
		// 	})
		// 	.from(schema.resumeFile)
		// 	.where(eq(schema.resumeFile.sessionId, sessionId));

		// Build and publish the pipeline job
		const payload = {
			session_id: sessionId,
			job_description: jobDescription,
			files: sessionFiles.map((f) => ({
				file_id: f.fileId,
				storage_key: f.storageKey,
				original_name: f.originalName,
			})),
		};

		try {
			await publishPipelineJob(payload);
		}
		catch (err) {
			// Rollback: mark session as failed
			await db
				.update(schema.profilingSession)
				.set({
					status: "failed",
					errorMessage: err instanceof Error ? err.message : "Failed to publish to queue",
				})
				.where(eq(schema.profilingSession.id, sessionId));

			return status(500, {
				status: "error",
				message: "Failed to submit job to processing queue",
			});
		}

			return {
				status: "processing",
				sessionId,
				totalConfirmed: files.length,
			};
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
			// Fire session and files queries concurrently
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
					.from(schema.resumeFile)
					.where(eq(schema.resumeFile.sessionId, params.id)),
			]);

			const session = sessionRows[0];
			if (!session)
				return status(404, { status: "error", message: "Session not found" });

			if (files.length === 0)
				return status(404, { status: "error", message: "Files not found" });

			// If the session is completed, include ranked results in the same response
			let results: {
				id: string;
				fileId: number;
				candidateName: string | null;
				candidateEmail: string | null;
				candidatePhone: string | null;
				parsedProfile: unknown;
				overallScore: string;
				summary: string;
				skillsMatched: unknown;
				pipelineVersion: string;
				createdAt: Date | null;
				originalName: string;
			}[] | null = null;

			if (session.status === "completed") {
				results = await db
					.select({
						id: schema.candidateResult.id,
						fileId: schema.candidateResult.fileId,
						candidateName: schema.candidateResult.candidateName,
						candidateEmail: schema.candidateResult.candidateEmail,
						candidatePhone: schema.candidateResult.candidatePhone,
						parsedProfile: schema.candidateResult.parsedProfile,
						overallScore: schema.candidateResult.overallScore,
						summary: schema.candidateResult.summary,
						skillsMatched: schema.candidateResult.skillsMatched,
						pipelineVersion: schema.candidateResult.pipelineVersion,
						createdAt: schema.candidateResult.createdAt,
						originalName: schema.resumeFile.originalName,
					})
					.from(schema.candidateResult)
					.innerJoin(
						schema.resumeFile,
						eq(schema.candidateResult.fileId, schema.resumeFile.id),
					)
					.where(eq(schema.candidateResult.sessionId, params.id))
					.orderBy(desc(schema.candidateResult.overallScore));
			}

			return {
				session,
				files: files.map((file) => ({
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
			const sortDir = query.sort === "asc" ? schema.candidateResult.overallScore : desc(schema.candidateResult.overallScore);

			const [sessionRows, results] = await Promise.all([
				db
					.select({ id: schema.profilingSession.id, status: schema.profilingSession.status })
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
						fileId: schema.candidateResult.fileId,
						candidateName: schema.candidateResult.candidateName,
						candidateEmail: schema.candidateResult.candidateEmail,
						candidatePhone: schema.candidateResult.candidatePhone,
						parsedProfile: schema.candidateResult.parsedProfile,
						overallScore: schema.candidateResult.overallScore,
						summary: schema.candidateResult.summary,
						skillsMatched: schema.candidateResult.skillsMatched,
						pipelineVersion: schema.candidateResult.pipelineVersion,
						createdAt: schema.candidateResult.createdAt,
						originalName: schema.resumeFile.originalName,
					})
					.from(schema.candidateResult)
					.innerJoin(
						schema.resumeFile,
						eq(schema.candidateResult.fileId, schema.resumeFile.id),
					)
					.where(eq(schema.candidateResult.sessionId, params.id))
					.orderBy(sortDir),
			]);

			const session = sessionRows[0];
			if (!session) {
				return status(404, { status: "error", message: "Session not found" });
			}

			return {
				sessionId: params.id,
				sessionStatus: session.status,
				totalResults: results.length,
				results,
			};
		},
		{
			auth: true,
			query: t.Object({
				sort: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
			}),
		},
	)

	// ── Get a single candidate result ────────────────────────────
	.get(
		"/:id/results/:resultId",
		async ({ user, params, status }) => {
			const [sessionRows, resultRows] = await Promise.all([
				db.select({ id: schema.profilingSession.id })
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
						pipelineVersion: schema.candidateResult.pipelineVersion,
						createdAt: schema.candidateResult.createdAt,
						originalName: schema.resumeFile.originalName,
						mimeType: schema.resumeFile.mimeType,
					})
					.from(schema.candidateResult)
					.innerJoin(
						schema.resumeFile,
						eq(schema.candidateResult.fileId, schema.resumeFile.id),
					)
					.where(
						and(
							eq(schema.candidateResult.id, params.resultId),
							eq(schema.candidateResult.sessionId, params.id),
						),
					),
			]);

			if (!sessionRows[0])
				return status(404, { status: "error", message: "Session not found" });

			const result = resultRows[0];
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
						candidateName: schema.candidateResult.candidateName,
						candidateEmail: schema.candidateResult.candidateEmail,
						candidatePhone: schema.candidateResult.candidatePhone,
						parsedProfile: schema.candidateResult.parsedProfile,
						overallScore: schema.candidateResult.overallScore,
						scoreBreakdown: schema.candidateResult.scoreBreakdown,
						summary: schema.candidateResult.summary,
						skillsMatched: schema.candidateResult.skillsMatched,
						pipelineVersion: schema.candidateResult.pipelineVersion,
						originalName: schema.resumeFile.originalName,
					})
					.from(schema.candidateResult)
					.innerJoin(
						schema.resumeFile,
						eq(schema.candidateResult.fileId, schema.resumeFile.id),
					)
					.where(eq(schema.candidateResult.sessionId, params.id))
					.orderBy(desc(schema.candidateResult.overallScore)),
			]);

			const session = sessionRows[0];
			if (!session)
				return status(404, { status: "error", message: "Session not found" });
			if (session.status !== "completed")
				return status(409, { status: "error", message: "Session is not completed yet" });

			const format = query.format ?? "json";

			if (format === "csv") {
				const csvHeaders = [
					"Rank",
					"Display Name",
					"Candidate Name",
					"Email",
					"Phone",
					"Identity Source",
					"Name Confidence",
					"Parse Warnings",
					"Overall Score",
					"Summary",
					"Skills Matched",
					"Resume File",
				];

				const csvRows = results.map((r, i) => [
					String(i + 1),
					escapeCsv(buildDisplayName(r.candidateName, r.originalName, r.parsedProfile)),
					escapeCsv(r.candidateName ?? "Unknown"),
					escapeCsv(r.candidateEmail ?? ""),
					escapeCsv(r.candidatePhone ?? ""),
					escapeCsv(getIdentitySource(r.parsedProfile)),
					escapeCsv(getNameConfidence(r.parsedProfile)),
					escapeCsv(getParseWarnings(r.parsedProfile)),
					r.overallScore,
					escapeCsv(stripMarkup(r.summary)),
					escapeCsv((r.skillsMatched as string[]).join("; ")),
					escapeCsv(r.originalName),
				].join(","));

				const csv = [csvHeaders.join(","), ...csvRows].join("\n");
				const safeName = session.name.replace(/[^a-zA-Z0-9_-]/g, "_");

				set.headers["content-type"] = "text/csv; charset=utf-8";
				set.headers["content-disposition"] = `attachment; filename="${safeName}-results.csv"`;

				return csv;
			}

			// Default: JSON export
			return {
				sessionId: session.id,
				sessionName: session.name,
				exportedAt: new Date().toISOString(),
				totalResults: results.length,
				results: results.map((r, i) => ({
					rank: i + 1,
					...r,
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

/**
 * Escape a value for safe CSV output.
 */
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

function getIdentitySource(parsedProfile: unknown) {
	return String((parsedProfile as { identity_source?: string } | null)?.identity_source ?? "unknown");
}

function getNameConfidence(parsedProfile: unknown) {
	const confidence = (parsedProfile as { name_confidence?: number } | null)?.name_confidence;
	return typeof confidence === "number" ? confidence.toFixed(2) : "0.00";
}

function getParseWarnings(parsedProfile: unknown) {
	const warnings = (parsedProfile as { parse_warnings?: string[] } | null)?.parse_warnings ?? [];
	return Array.isArray(warnings) ? warnings.join("; ") : "";
}

function stripMarkup(value: string) {
	return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
