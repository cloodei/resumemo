import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILES_PER_SESSION } from "@shared/constants/file-uploads";

import { db } from "~/lib/db";
import { authMiddleware } from "~/lib/auth";
import { validateFileMetadata } from "~/lib/upload-guard";
import {
	deleteFile,
	generatePresignedUploadUrl,
	generateStorageKey,
	headFile,
} from "~/lib/storage";

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

			await db
				.update(schema.profilingSession)
				.set({ status: "processing" })
				.where(eq(schema.profilingSession.id, params.id));

			// TODO: Trigger actual profiling service here.

			return { status: "ok", message: "Profiling started" };
		},
		{ auth: true },
	);
