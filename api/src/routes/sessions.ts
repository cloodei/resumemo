import { Elysia, t } from "elysia";
import { randomUUIDv7 } from "bun";
import { and, desc, eq } from "drizzle-orm";

import * as schema from "@resumemo/core/schemas";
import { MAX_FILES_PER_SESSION } from "@resumemo/core/constants/file-uploads";

import { db } from "~/lib/db";
import {
	getOrSetSessionCache,
	invalidateSessionList,
	invalidateSessionNamespace,
	sessionCacheKeys,
} from "~/lib/session-cache";
import { authMiddleware } from "~/lib/auth";
import { validateFileMetadata } from "~/lib/upload-guard";
import { publishPipelineJob } from "~/lib/queue";
import {
	generatePresignedUploadUrl,
	generateStorageKey,
	cleanupUploadedKeys,
	verifyUploads,
} from "~/lib/storage";

type SessionFileRecord = {
	fileId: number;
	storageKey: string;
	originalName: string;
	mimeType: string;
	size: bigint;
};

type SessionResultRecord = {
	id: string;
	runId: string;
	fileId: number;
	candidateName: string | null;
	candidateEmail: string | null;
	candidatePhone: string | null;
	parsedProfile: unknown;
	overallScore: unknown;
	summary: string;
	skillsMatched: unknown;
	createdAt: Date;
	originalName: string;
};

type SessionDetailResponse = {
	session: unknown;
	files: { id: number; originalName: string; mimeType: string; size: number }[];
	results: SessionResultRecord[] | null;
};

type SessionResultsResponse = {
	sessionId: string;
	sessionStatus: string;
	totalResults: number;
	results: SessionResultRecord[];
};

type RouteErrorResponse = {
	status: string;
	message: string;
};

function isRouteErrorResponse(value: unknown): value is RouteErrorResponse {
	if (!value || typeof value !== "object")
		return false;

	return "status" in value && "message" in value;
}

const CREATE_SESSION_FAILED_MESSAGE = "We couldn't start processing. Please try again.";
const RETRY_SESSION_FAILED_MESSAGE = "We couldn't restart processing. Please try again.";
const RETRY_CLONE_FAILED_MESSAGE = "We couldn't start the new copied session. Please try again.";

function filterActiveRunResults<T extends { runId?: string | null }>(results: T[], activeRunId: string | null) {
	if (!activeRunId)
		return results;

	return results.filter(result => result.runId === activeRunId);
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

			let sessionId = "";
			let sessionPersisted = false;
			try {
				const runId = randomUUIDv7();
				let sessionFiles: SessionFileRecord[] = [];

				await db.transaction(async (tx) => {
					const [[createdSession], sessionFiles] = await Promise.all([
						tx.insert(schema.profilingSession)
							.values({
								userId: user.id,
								name,
								jobDescription,
								jobTitle: jobTitle ?? null,
								status: "processing",
								activeRunId: runId,
								totalFiles: files.length,
								errorMessage: null,
								lastCompletedAt: null,
							})
							.returning({ id: schema.profilingSession.id }),
						tx.insert(schema.resumeFile)
							.values(files.map(file => ({
								userId: user.id,
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
							})
					]);

					sessionId = createdSession.id;
					await tx.insert(schema.profilingSessionFile).values(
						sessionFiles.map(file => ({
							sessionId,
							fileId: file.fileId,
						})),
					);
				});
				sessionPersisted = true;

				try {
					await publishPipelineJob({
						session_id: sessionId,
						run_id: runId,
						job_description: jobDescription,
						files: sessionFiles.map(file => ({
							file_id: file.fileId,
							storage_key: file.storageKey,
							original_name: file.originalName,
						})),
					});
				}
				catch (error) {
					await db
						.update(schema.profilingSession)
						.set({
							status: "failed",
							errorMessage: CREATE_SESSION_FAILED_MESSAGE,
							lastCompletedAt: null,
						})
						.where(eq(schema.profilingSession.id, sessionId));

					invalidateSessionNamespace(user.id, sessionId);
					invalidateSessionList(user.id);

					throw error;
				}

				invalidateSessionList(user.id);

				return {
					status: "processing" as const,
					sessionId,
					runId,
					totalConfirmed: files.length,
				};
			}
			catch {
				return status(500, {
					status: "error",
					message: "We couldn't start processing.",
					details: "Please try again.",
					retryable: true,
					targetSessionId: sessionPersisted ? sessionId : null,
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
			if (existingSession.status === "processing" || existingSession.status === "retrying")
				return status(409, { status: "error", message: "This session is already running" });

			const u = await db
				.select({
					storageKey: schema.resumeFile.storageKey,
					fileName: schema.resumeFile.originalName,
					mimeType: schema.resumeFile.mimeType,
					size: schema.resumeFile.size,
				})
				.from(schema.profilingSessionFile)
				.innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
				.where(eq(schema.profilingSessionFile.sessionId, existingSession.id));

			if (u.length === 0) {
				return status(404, {
					status: "error",
					message: "Files not found for this session",
				});
			}

			const reusableFailures = await verifyUploads(u.map(up => ({
				...up,
				size: Number(up.size)
			})));

			if (reusableFailures.length > 0) {
				return status(409, {
					status: "error",
					message: "Some existing uploads are no longer available for retry",
					failures: reusableFailures,
				});
			}

			const nextName = body.name?.trim() || existingSession.name;
			const nextJobTitle = body.jobTitle !== undefined
				? body.jobTitle.trim() || null
				: existingSession.jobTitle;
			const nextJobDescription = body.jobDescription?.trim() || existingSession.jobDescription;

			try {
				const currentFiles = await db
					.select({
						fileId: schema.resumeFile.id,
						storageKey: schema.resumeFile.storageKey,
						originalName: schema.resumeFile.originalName,
						mimeType: schema.resumeFile.mimeType,
						size: schema.resumeFile.size,
					})
					.from(schema.profilingSessionFile)
					.innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
					.where(eq(schema.profilingSessionFile.sessionId, existingSession.id));
				if (currentFiles.length === 0) {
					return status(404, {
						status: "error",
						message: "Files not found for this session",
					});
				}

				switch (body.mode) {
					case "rerun_current": {
						const runId = randomUUIDv7();

						await db
							.update(schema.profilingSession)
							.set({
								name: existingSession.name,
								jobTitle: existingSession.jobTitle,
								jobDescription: existingSession.jobDescription,
								status: "retrying",
								activeRunId: runId,
								errorMessage: null,
								lastCompletedAt: null,
								totalFiles: currentFiles.length,
							})
							.where(eq(schema.profilingSession.id, existingSession.id));

						try {
							await publishPipelineJob({
								session_id: existingSession.id,
								run_id: runId,
								job_description: existingSession.jobDescription,
								files: currentFiles.map(file => ({
									file_id: file.fileId,
									storage_key: file.storageKey,
									original_name: file.originalName,
								})),
							});
						}
						catch {
							await db
								.update(schema.profilingSession)
								.set({
									status: "failed",
									errorMessage: RETRY_SESSION_FAILED_MESSAGE,
									lastCompletedAt: null,
								})
								.where(eq(schema.profilingSession.id, existingSession.id));
							invalidateSessionNamespace(user.id, existingSession.id);
							invalidateSessionList(user.id);

							return status(500, {
								status: "error",
								message: "We couldn't restart processing.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: existingSession.id,
							});
						}

						invalidateSessionNamespace(user.id, existingSession.id);
						invalidateSessionList(user.id);

						return {
							status: "retrying" as const,
							sessionId: existingSession.id,
							runId,
							totalConfirmed: currentFiles.length,
							action: "rerun_current",
							targetSessionId: existingSession.id,
						};
					}

					case "clone_current": {
						const runId = randomUUIDv7();
						let sessionId = "";

						await db.transaction(async (tx) => {
							const [createdSession] = await tx
								.insert(schema.profilingSession)
								.values({
									userId: user.id,
									name: existingSession.name,
									jobDescription: existingSession.jobDescription,
									jobTitle: existingSession.jobTitle,
									status: "processing",
									activeRunId: runId,
									totalFiles: currentFiles.length,
									errorMessage: null,
									lastCompletedAt: null,
								})
								.returning({ id: schema.profilingSession.id });

							sessionId = createdSession.id;
							await tx.insert(schema.profilingSessionFile).values(
								currentFiles.map(file => ({
									sessionId: createdSession.id,
									fileId: file.fileId,
								})),
							);
						});

						try {
							await publishPipelineJob({
								session_id: sessionId,
								run_id: runId,
								job_description: existingSession.jobDescription,
								files: currentFiles.map(file => ({
									file_id: file.fileId,
									storage_key: file.storageKey,
									original_name: file.originalName,
								})),
							});
						}
						catch {
							await db
								.update(schema.profilingSession)
								.set({
									status: "failed",
									errorMessage: RETRY_CLONE_FAILED_MESSAGE,
									lastCompletedAt: null,
								})
								.where(eq(schema.profilingSession.id, sessionId));
							invalidateSessionNamespace(user.id, sessionId);
							invalidateSessionList(user.id);

							return status(500, {
								status: "error",
								message: "We couldn't start the new copied session.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: sessionId,
							});
						}

						invalidateSessionNamespace(user.id, sessionId);
						invalidateSessionList(user.id);

						return {
							status: "processing" as const,
							sessionId,
							runId,
							totalConfirmed: currentFiles.length,
							action: "clone_current",
							targetSessionId: sessionId,
						};
					}

					case "clone_with_updates": {
						const runId = randomUUIDv7();
						let sessionId = "";

						await db.transaction(async (tx) => {
							const [createdSession] = await tx
								.insert(schema.profilingSession)
								.values({
									userId: user.id,
									name: nextName,
									jobDescription: nextJobDescription,
									jobTitle: nextJobTitle,
									status: "processing",
									activeRunId: runId,
									totalFiles: currentFiles.length,
									errorMessage: null,
									lastCompletedAt: null,
								})
								.returning({ id: schema.profilingSession.id });

							sessionId = createdSession.id;
							await tx.insert(schema.profilingSessionFile).values(
								currentFiles.map(file => ({
									sessionId: createdSession.id,
									fileId: file.fileId,
								})),
							);
						});

						try {
							await publishPipelineJob({
								session_id: sessionId,
								run_id: runId,
								job_description: nextJobDescription,
								files: currentFiles.map(file => ({
									file_id: file.fileId,
									storage_key: file.storageKey,
									original_name: file.originalName,
								})),
							});
						}
						catch {
							await db
								.update(schema.profilingSession)
								.set({
									status: "failed",
									errorMessage: RETRY_CLONE_FAILED_MESSAGE,
									lastCompletedAt: null,
								})
								.where(eq(schema.profilingSession.id, sessionId));
							invalidateSessionNamespace(user.id, sessionId);
							invalidateSessionList(user.id);

							return status(500, {
								status: "error",
								message: "We couldn't start the new copied session.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: sessionId,
							});
						}

						invalidateSessionNamespace(user.id, sessionId);
						invalidateSessionList(user.id);

						return {
							status: "processing" as const,
							sessionId,
							runId,
							totalConfirmed: currentFiles.length,
							action: "clone_with_updates",
							targetSessionId: sessionId,
						};
					}

					case "replace_with_updates": {
						const runId = randomUUIDv7();

						await db
							.update(schema.profilingSession)
							.set({
								name: nextName,
								jobTitle: nextJobTitle,
								jobDescription: nextJobDescription,
								status: "retrying",
								activeRunId: runId,
								errorMessage: null,
								lastCompletedAt: null,
								totalFiles: currentFiles.length,
							})
							.where(eq(schema.profilingSession.id, existingSession.id));

						try {
							await publishPipelineJob({
								session_id: existingSession.id,
								run_id: runId,
								job_description: nextJobDescription,
								files: currentFiles.map(file => ({
									file_id: file.fileId,
									storage_key: file.storageKey,
									original_name: file.originalName,
								})),
							});
						}
						catch {
							await db
								.update(schema.profilingSession)
								.set({
									status: "failed",
									errorMessage: RETRY_SESSION_FAILED_MESSAGE,
									lastCompletedAt: null,
								})
								.where(eq(schema.profilingSession.id, existingSession.id));
							invalidateSessionNamespace(user.id, existingSession.id);
							invalidateSessionList(user.id);

							return status(500, {
								status: "error",
								message: "We couldn't restart processing.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: existingSession.id,
							});
						}

						invalidateSessionNamespace(user.id, existingSession.id);
						invalidateSessionList(user.id);

						return {
							status: "retrying" as const,
							sessionId: existingSession.id,
							runId,
							totalConfirmed: currentFiles.length,
							action: "replace_with_updates",
							targetSessionId: existingSession.id,
						};
					}
				}
			}
			catch {
				return status(500, {
					status: "error",
					message: "We couldn't restart processing.",
					details: "Please try again.",
					retryable: true,
					targetSessionId: body.mode === "clone_current" || body.mode === "clone_with_updates"
						? null
						: existingSession.id,
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
			return getOrSetSessionCache(sessionCacheKeys.list(user.id), async () => {
				const sessions = await db
					.select()
					.from(schema.profilingSession)
					.where(eq(schema.profilingSession.userId, user.id))
					.orderBy(desc(schema.profilingSession.createdAt));

				return { sessions };
			});
		},
		{ auth: true },
	)

	.get(
		"/:id",
		async ({ user, params, status }) => {
			const cacheKey = sessionCacheKeys.detail(user.id, params.id);

			const response = await getOrSetSessionCache<SessionDetailResponse | RouteErrorResponse>(
				cacheKey,
				async () => {
					const [sessionRows, files] = await Promise.all([
						db.select()
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
						return { status: "error", message: "Session not found" };
					if (files.length === 0)
						return { status: "error", message: "Files not found" };

					let results: SessionResultRecord[] | null = null;
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
							.where(eq(schema.candidateResult.sessionId, params.id))
							.orderBy(desc(schema.candidateResult.overallScore));

						results = filterActiveRunResults(results, session.activeRunId ?? null);
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
				value => !isRouteErrorResponse(value),
			);

			if (isRouteErrorResponse(response))
				return status(404, response);

			return response;
		},
		{ auth: true },
	)
	.get(
		"/:id/results",
		async ({ user, params, status, query }) => {
			const sort = query.sort === "asc" ? "asc" : "desc";
			const cacheKey = sessionCacheKeys.results(user.id, params.id, sort);

			const response = await getOrSetSessionCache<SessionResultsResponse | RouteErrorResponse>(
				cacheKey,
				async () => {
					const sessionRows = await db
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
						);

					const session = sessionRows[0];
					if (!session)
						return { status: "error", message: "Session not found" };

					const sortDir = query.sort === "asc"
						? schema.candidateResult.overallScore
						: desc(schema.candidateResult.overallScore);

					const results = await db
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
						.orderBy(sortDir);

					const filteredResults = filterActiveRunResults(results, session.activeRunId ?? null);

					return {
						sessionId: params.id,
						sessionStatus: session.status,
						totalResults: filteredResults.length,
						results: filteredResults,
					};
				},
				value => !isRouteErrorResponse(value),
			);

			if (isRouteErrorResponse(response))
				return status(404, response);

			return response;
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
			const cacheKey = sessionCacheKeys.result(user.id, params.id, params.resultId);

			const response = await getOrSetSessionCache<{
				result: {
						id: string;
						runId: string;
						sessionId: string;
						fileId: number;
						candidateName: string | null;
						candidateEmail: string | null;
						candidatePhone: string | null;
						rawText: string;
						parsedProfile: unknown;
						overallScore: string;
						scoreBreakdown: unknown;
						summary: string;
						skillsMatched: unknown;
						createdAt: Date;
						originalName: string;
						mimeType: string;
				};
				status?: undefined;
				message?: undefined;
			} | RouteErrorResponse>(
				cacheKey,
				async () => {
					const sessionRows = await db
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
						);

					const session = sessionRows[0];
					if (!session)
						return { status: "error", message: "Session not found" };

					const resultRows = await db
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
						);

					const [result] = filterActiveRunResults(resultRows, session.activeRunId ?? null);
					if (!result)
						return { status: "error", message: "Result not found" };

					return { result };
				},
				value => !isRouteErrorResponse(value),
			);

			if (isRouteErrorResponse(response))
				return status(404, response);

			return response;
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

			const filteredResults = filterActiveRunResults(results, session.activeRunId ?? null);
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
