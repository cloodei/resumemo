import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILES_PER_SESSION } from "@shared/constants/file-uploads";

import { db } from "~/lib/db";
import { authMiddleware } from "~/lib/auth";
import { validateFileMetadata } from "~/lib/upload-guard";
import { publishPipelineJob, type PipelineJobPayload } from "~/lib/queue";
import {
	deleteFile,
	generatePresignedUploadUrl,
	generateStorageKey,
	headFile,
} from "~/lib/storage";

const PIPELINE_VERSION = "0.1.0";
const PIPELINE_CALLBACK_SECRET = process.env.PIPELINE_CALLBACK_SECRET ?? "";

async function cleanupUploadedKeys(storageKeys: string[]) {
	await Promise.all(storageKeys.map(async (storageKey) => {
		try { await deleteFile(storageKey) }
		catch { /* Best-effort cleanup */ }
	}));
}

export const sessionRoutes = new Elysia({ prefix: "/api/v2/sessions" })
	.use(authMiddleware)

	// ── Step 1: Get presigned upload URLs ──────────────────────────
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

	// ── Step 2: Verify uploads landed in R2, then create session + file records ──
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

			// HEAD-check each file in R2
			const failures: { storageKey: string; reason: string }[] = [];
			for (const file of files) {
				try {
					const head = await headFile(file.storageKey);
					const size = Number(head.ContentLength ?? 0);
					const mimeType = head.ContentType ?? file.mimeType;
					const check = validateFileMetadata({
						fileName: file.fileName,
						claimedMimeType: mimeType,
						size,
					});

					if (!check.ok) {
						failures.push({ storageKey: file.storageKey, reason: check.message });
					}
				}
				catch {
					failures.push({
						storageKey: file.storageKey,
						reason: "Uploaded object is missing or unreadable",
					});
				}
			}

			if (failures.length > 0) {
				await cleanupUploadedKeys(files.map((f) => f.storageKey));

				return status(400, {
					status: "error",
					message: "Upload verification failed",
					failures,
				});
			}

			// All files verified — insert session + files in one transaction
			let sessionId = "";
			await db.transaction(async (tx) => {
				const [[createdSession], insertedFiles] = await Promise.all([
					tx.insert(schema.profilingSession)
						.values({
							userId: user.id,
							name,
							jobDescription,
							jobTitle,
							status: "ready",
							totalFiles: files.length,
						})
						.returning({ id: schema.profilingSession.id }),
					tx.insert(schema.resumeFile)
						.values(
							files.map((file) => ({
								userId: user.id,
								originalName: file.fileName,
								mimeType: file.mimeType,
								size: BigInt(file.size),
								storageKey: file.storageKey,
							})),
						)
						.returning({ id: schema.resumeFile.id }),
					]);

				sessionId = createdSession.id;
				if (insertedFiles.length > 0) {
					await tx.insert(schema.profilingSessionFile).values(
						insertedFiles.map((file) => ({
							sessionId,
							fileId: file.id,
						})),
					);
				}
			});

			return {
				status: "ready",
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

	// ── List all profiling sessions for the authenticated user ────
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

	// ── Get a specific profiling session with its associated files ─
	.get(
		"/:id",
		async ({ user, params, status }) => {
			const [session] = await db
				.select()
				.from(schema.profilingSession)
				.where(
					and(
						eq(schema.profilingSession.id, params.id),
						eq(schema.profilingSession.userId, user.id),
					),
				);

			if (!session) {
				return status(404, { status: "error", message: "Session not found" });
			}

			const filesWithDetails = await db
				.select({
					sessionFile: schema.profilingSessionFile,
					file: schema.resumeFile,
				})
				.from(schema.profilingSessionFile)
				.innerJoin(
					schema.resumeFile,
					eq(schema.profilingSessionFile.fileId, schema.resumeFile.id),
				)
				.where(eq(schema.profilingSessionFile.sessionId, params.id));

			return {
				session,
				files: filesWithDetails.map(({ file }) => ({
					id: file.id,
					originalName: file.originalName,
					mimeType: file.mimeType,
					size: Number(file.size),
				})),
			};
		},
		{ auth: true },
	)

	// ── Start profiling (transition ready → processing) ──────────
	.post(
		"/:id/start",
		async ({ user, params, status }) => {
			const [session] = await db
				.select()
				.from(schema.profilingSession)
				.where(
					and(
						eq(schema.profilingSession.id, params.id),
						eq(schema.profilingSession.userId, user.id),
					),
				);

			if (!session) {
				return status(404, { status: "error", message: "Session not found" });
			}

			if (session.status !== "ready") {
				return status(409, { status: "error", message: "Session is not ready to start" });
			}

			// 1. Query the session's files
			const sessionFiles = await db
				.select({
					fileId: schema.resumeFile.id,
					storageKey: schema.resumeFile.storageKey,
					originalName: schema.resumeFile.originalName,
					mimeType: schema.resumeFile.mimeType,
					size: schema.resumeFile.size,
				})
				.from(schema.profilingSessionFile)
				.innerJoin(
					schema.resumeFile,
					eq(schema.profilingSessionFile.fileId, schema.resumeFile.id),
				)
				.where(eq(schema.profilingSessionFile.sessionId, params.id));

			if (sessionFiles.length === 0) {
				return status(400, { status: "error", message: "Session has no files" });
			}

			// 2. Insert a pipelineJob row
			const [pipelineJobRow] = await db
				.insert(schema.pipelineJob)
				.values({
					sessionId: params.id,
					status: "queued",
					pipelineVersion: PIPELINE_VERSION,
					totalFiles: sessionFiles.length,
				})
				.returning({ id: schema.pipelineJob.id });

			// 3. Transition session to processing
			await db
				.update(schema.profilingSession)
				.set({ status: "processing" })
				.where(eq(schema.profilingSession.id, params.id));

			// 4. Build and publish the pipeline job payload
			const callbackBaseUrl = process.env.API_BASE_URL ?? "http://localhost:8080";
			const payload: PipelineJobPayload = {
				session_id: params.id,
				job_id: pipelineJobRow.id,
				callback_url: `${callbackBaseUrl}/api/internal/pipeline/callback`,
				callback_secret: PIPELINE_CALLBACK_SECRET,
				job_description: session.jobDescription,
				job_title: session.jobTitle ?? null,
				pipeline_version: PIPELINE_VERSION,
				files: sessionFiles.map((f) => ({
					file_id: f.fileId,
					storage_key: f.storageKey,
					original_name: f.originalName,
					mime_type: f.mimeType,
					size: Number(f.size),
				})),
			};

			try {
				await publishPipelineJob(payload);
			} catch (err) {
				// Rollback: mark job as failed if we can't publish
				await db
					.update(schema.pipelineJob)
					.set({
						status: "failed",
						errorMessage: err instanceof Error ? err.message : "Failed to publish to queue",
						completedAt: new Date(),
					})
					.where(eq(schema.pipelineJob.id, pipelineJobRow.id));

				await db
					.update(schema.profilingSession)
					.set({
						status: "failed",
						errorMessage: "Failed to submit job to processing queue",
					})
					.where(eq(schema.profilingSession.id, params.id));

				return status(500, {
					status: "error",
					message: "Failed to submit job to processing queue",
				});
			}

			return {
				status: "ok",
				message: "Profiling started",
				jobId: pipelineJobRow.id,
			};
		},
		{ auth: true },
	)

	// ── List candidate results for a session ─────────────────────
	.get(
		"/:id/results",
		async ({ user, params, status, query }) => {
			// Verify ownership
			const [session] = await db
				.select({ id: schema.profilingSession.id, status: schema.profilingSession.status })
				.from(schema.profilingSession)
				.where(
					and(
						eq(schema.profilingSession.id, params.id),
						eq(schema.profilingSession.userId, user.id),
					),
				);

			if (!session) {
				return status(404, { status: "error", message: "Session not found" });
			}

			const sortDir = query.sort === "asc" ? schema.candidateResult.overallScore : desc(schema.candidateResult.overallScore);

			const results = await db
				.select({
					id: schema.candidateResult.id,
					fileId: schema.candidateResult.fileId,
					candidateName: schema.candidateResult.candidateName,
					candidateEmail: schema.candidateResult.candidateEmail,
					candidatePhone: schema.candidateResult.candidatePhone,
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
				.orderBy(sortDir);

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
			// Verify session ownership
			const [session] = await db
				.select({ id: schema.profilingSession.id })
				.from(schema.profilingSession)
				.where(
					and(
						eq(schema.profilingSession.id, params.id),
						eq(schema.profilingSession.userId, user.id),
					),
				);

			if (!session) {
				return status(404, { status: "error", message: "Session not found" });
			}

			const [result] = await db
				.select({
					id: schema.candidateResult.id,
					sessionId: schema.candidateResult.sessionId,
					fileId: schema.candidateResult.fileId,
					jobId: schema.candidateResult.jobId,
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
				);

			if (!result) {
				return status(404, { status: "error", message: "Result not found" });
			}

			return { result };
		},
		{ auth: true },
	)

	// ── Export session results as JSON or CSV ─────────────────────
	.get(
		"/:id/export",
		async ({ user, params, status, query, set }) => {
			// Verify session ownership
			const [session] = await db
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
				);

			if (!session) {
				return status(404, { status: "error", message: "Session not found" });
			}

			if (session.status !== "completed") {
				return status(409, { status: "error", message: "Session is not completed yet" });
			}

			const results = await db
				.select({
					candidateName: schema.candidateResult.candidateName,
					candidateEmail: schema.candidateResult.candidateEmail,
					candidatePhone: schema.candidateResult.candidatePhone,
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
				.orderBy(desc(schema.candidateResult.overallScore));

			const format = query.format ?? "json";

			if (format === "csv") {
				const csvHeaders = [
					"Rank",
					"Candidate Name",
					"Email",
					"Phone",
					"Overall Score",
					"Summary",
					"Skills Matched",
					"Resume File",
				];

				const csvRows = results.map((r, i) => [
					String(i + 1),
					escapeCsv(r.candidateName ?? "Unknown"),
					escapeCsv(r.candidateEmail ?? ""),
					escapeCsv(r.candidatePhone ?? ""),
					r.overallScore,
					escapeCsv(r.summary),
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
function escapeCsv(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
