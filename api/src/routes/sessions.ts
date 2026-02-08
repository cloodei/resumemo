import { Elysia, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";

import * as schema from "@shared/schemas";

import { db } from "../lib/db";
import { authMiddleware } from "../lib/auth";
import { deleteFile, generateStorageKey, generateUploadUrl, headFile } from "../lib/storage";

const sessionRoutes = new Elysia({ prefix: "/api/sessions" })
	.use(authMiddleware)
	/**
	 * Create a new profiling session and get presigned upload URLs.
	 *
	 * This is the single entry point for the upload flow. It:
	 * 1. Deduplicates files by fingerprint + size + mimeType against existing user files
	 * 2. Creates the profiling session (status: "uploading")
	 * 3. Creates new file records for files that don't already exist
	 * 4. Creates join table entries for all files (new + reused)
	 * 5. Returns presigned URLs only for files that need uploading
	 */
	.post(
		"/",
		async ({ user, body, set }) => {
			const { name, jobTitle, jobDescription, files } = body;
			const fingerprints = files.map((file) => file.fingerprint);

			let existingFiles: (typeof schema.resumeFile.$inferSelect)[] = [];
			if (fingerprints.length > 0) {
				existingFiles = await db
					.select()
					.from(schema.resumeFile)
					.where(and(
						eq(schema.resumeFile.userId, user.id),
						inArray(schema.resumeFile.fingerprint, fingerprints),
					));
			}

			// Build a lookup: fingerprint+size+mimeType -> existing file record
			const existingLookup = new Map(
				existingFiles.map((file) => [
					`${file.fingerprint}:${file.size}:${file.mimeType}`,
					file,
				]),
			);

			// Partition incoming files into reused vs new
			const reusedFiles: { id: string; originalName: string }[] = [];
			const newFileEntries: {
				meta: typeof files[number];
				storageKey: string;
			}[] = [];

			for (const file of files) {
				const key = `${file.fingerprint}:${file.size}:${file.mimeType}`;
				const existing = existingLookup.get(key);

				if (existing) {
					reusedFiles.push({ id: existing.id, originalName: existing.originalName });
				} else {
					const storageKey = generateStorageKey(user.id, file.name);
					newFileEntries.push({ meta: file, storageKey });
				}
			}

			// --- Create new file records ---
			let insertedFiles: (typeof schema.resumeFile.$inferSelect)[] = [];
			if (newFileEntries.length > 0) {
				insertedFiles = await db
					.insert(schema.resumeFile)
					.values(newFileEntries.map(({ meta, storageKey }) => ({
						userId: user.id,
						originalName: meta.name,
						mimeType: meta.mimeType,
						size: BigInt(meta.size),
						storageKey,
						fingerprint: meta.fingerprint,
					})))
					.returning();
			}

			// --- Generate presigned URLs for new files ---
			const newUploads = await Promise.all(
				insertedFiles.map(async (file, index) => {
					const uploadUrl = await generateUploadUrl(
						newFileEntries[index].storageKey,
						file.mimeType,
					);
					return {
						id: file.id,
						originalName: file.originalName,
						uploadUrl,
						storageKey: file.storageKey,
					};
				}),
			);

			const totalFiles = reusedFiles.length + insertedFiles.length;

			// --- Create the profiling session ---
			const [session] = await db
				.insert(schema.profilingSession)
				.values({
					userId: user.id,
					name,
					jobDescription,
					jobTitle,
					status: "uploading",
					totalFiles,
				})
				.returning();

			// --- Create join table entries for ALL files (reused + new) ---
			const allFileIds = [
				...reusedFiles.map((file) => file.id),
				...insertedFiles.map((file) => file.id),
			];

			if (allFileIds.length > 0) {
				await db
					.insert(schema.profilingSessionFile)
					.values(allFileIds.map((fileId) => ({
						sessionId: session.id,
						fileId,
					})));
			}

			return {
				session,
				newUploads,
				reusedFiles,
			};
		},
		{
			auth: true,
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 255 }),
				jobDescription: t.String({ minLength: 1 }),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
				files: t.Array(
					t.Object({
						name: t.String({ minLength: 1, maxLength: 512 }),
						size: t.Number({ minimum: 1, maximum: 2 * 1024 * 1024 }),
						mimeType: t.String({ minLength: 1, maxLength: 128 }),
						fingerprint: t.String({ minLength: 8, maxLength: 128 }),
					}),
					{ minItems: 1, maxItems: 50 },
				),
			}),
		},
	)

	/**
	 * Confirm upload completion for a session.
	 *
	 * The client sends the final list of successfully uploaded file IDs.
	 * Any files that were created but not confirmed are cleaned up (removed
	 * from R2 + DB). The session's totalFiles count is updated to reflect
	 * the actual confirmed set, and the session transitions to "ready".
	 *
	 * If zero files were confirmed, the session transitions to "failed".
	 */
	.post(
		"/:id/confirm",
		async ({ user, params, body, set }) => {
			const uploadedFileIds = Array.from(new Set(body.uploadedFileIds));

			// Verify session belongs to user and is in "uploading" state
			const [session] = await db
				.select()
				.from(schema.profilingSession)
				.where(and(
					eq(schema.profilingSession.id, params.id),
					eq(schema.profilingSession.userId, user.id),
				));

			if (!session) {
				set.status = 404;
				return { status: "error", message: "Session not found" };
			}

			if (session.status !== "uploading") {
				set.status = 409;
				return { status: "error", message: "Session is not in uploading state" };
			}

			// Get all files associated with this session
			const sessionFiles = await db.select({
				joinId: schema.profilingSessionFile.id,
				fileId: schema.profilingSessionFile.fileId,
				file: schema.resumeFile,
			})
				.from(schema.profilingSessionFile)
				.innerJoin(
					schema.resumeFile,
					eq(schema.profilingSessionFile.fileId, schema.resumeFile.id),
				)
				.where(eq(schema.profilingSessionFile.sessionId, params.id));

			const sessionFileIds = new Set(sessionFiles.map((file) => file.fileId));
			const invalidIds = uploadedFileIds.filter((id) => !sessionFileIds.has(id));
			if (invalidIds.length > 0) {
				set.status = 400;
				return { status: "error", message: "Invalid file ids for this session" };
			}

			const confirmedSet = new Set(uploadedFileIds);
			const joinIdByFileId = new Map(
				sessionFiles.map((file) => [file.fileId, file.joinId]),
			);

			const failedJoinIds: string[] = [];
			const failedFileIds: string[] = [];
			const confirmedValidIds: string[] = [];

			// Any files not confirmed are considered failed
			for (const file of sessionFiles) {
				if (!confirmedSet.has(file.fileId)) {
					failedJoinIds.push(file.joinId);
					failedFileIds.push(file.fileId);
				}
			}

			// Validate confirmed files against stored metadata
			for (const file of sessionFiles) {
				if (!confirmedSet.has(file.fileId)) continue;

				let headResult: Awaited<ReturnType<typeof headFile>> | null = null;
				try {
					headResult = await headFile(file.file.storageKey);
				} catch {
					headResult = null;
				}

				// const validation = validateStoredObject({
				// 	fileName: file.file.originalName,
				// 	expectedMimeType: file.file.mimeType,
				// 	contentType: headResult?.ContentType,
				// 	contentLength: headResult?.ContentLength,
				// });

				// if (!validation.ok) {
				// 	failedFileIds.push(file.fileId);
				// 	const joinId = joinIdByFileId.get(file.fileId);
				// 	if (joinId) failedJoinIds.push(joinId);
				// 	continue;
				// }

				confirmedValidIds.push(file.fileId);

				if (headResult?.ContentLength && headResult?.ContentType) {
					await db.update(schema.resumeFile)
						.set({
							size: BigInt(headResult.ContentLength),
							mimeType: headResult.ContentType,
						})
						.where(eq(schema.resumeFile.id, file.fileId));
				}
			}

			// Remove join records for files that weren't confirmed or failed validation
			if (failedJoinIds.length > 0) {
				await db.delete(schema.profilingSessionFile)
					.where(inArray(schema.profilingSessionFile.id, failedJoinIds));
			}

			// Clean up failed files from R2 and DB — but only if they aren't
			// referenced by other sessions (they could be reused files)
			for (const fileId of failedFileIds) {
				const otherRefs = await db.select({ id: schema.profilingSessionFile.id })
					.from(schema.profilingSessionFile)
					.where(eq(schema.profilingSessionFile.fileId, fileId));

				if (otherRefs.length === 0) {
					// No other session uses this file — safe to delete
					const [file] = await db.select()
						.from(schema.resumeFile)
						.where(eq(schema.resumeFile.id, fileId));

					if (file) {
						try { await deleteFile(file.storageKey); } catch { /* best-effort */ }
						await db.delete(schema.resumeFile)
							.where(eq(schema.resumeFile.id, fileId));
					}
				}
			}

			const confirmedCount = confirmedValidIds.length;

			if (confirmedCount === 0) {
				// No files made it — mark session as failed
				await db.update(schema.profilingSession)
					.set({
						status: "failed",
						totalFiles: 0,
						errorMessage: "No files were uploaded successfully",
					})
					.where(eq(schema.profilingSession.id, params.id));

				return { status: "failed", message: "No files uploaded", confirmedCount: 0 };
			}

			// Update session with final file count and transition to "ready"
			await db.update(schema.profilingSession)
				.set({
					status: "ready",
					totalFiles: confirmedCount,
				})
				.where(eq(schema.profilingSession.id, params.id));

			return { status: "ok", confirmedCount };
		},
		{
			auth: true,
			body: t.Object({
				uploadedFileIds: t.Array(t.String({ minLength: 1 })),
			}),
		},
	)

	/**
	 * Start profiling (transition ready -> processing).
	 * The actual AI pipeline is not yet implemented.
	 */
	.post(
		"/:id/start",
		async ({ user, params, set }) => {
			const [session] = await db
				.select()
				.from(schema.profilingSession)
				.where(and(
					eq(schema.profilingSession.id, params.id),
					eq(schema.profilingSession.userId, user.id),
				));

			if (!session) {
				set.status = 404;
				return { status: "error", message: "Session not found" };
			}

			if (session.status !== "ready") {
				set.status = 409;
				return { status: "error", message: "Session is not ready to start" };
			}

			await db
				.update(schema.profilingSession)
				.set({ status: "processing" })
				.where(eq(schema.profilingSession.id, params.id));

			// TODO: Trigger actual profiling service here

			return { status: "ok", message: "Profiling started" };
		},
		{ auth: true },
	)

	/**
	 * List all profiling sessions for the authenticated user.
	 */
	.get("/", async ({ user }) => {
		const sessions = await db
			.select()
			.from(schema.profilingSession)
			.where(eq(schema.profilingSession.userId, user.id))
			.orderBy(desc(schema.profilingSession.createdAt));

		return { sessions };
	}, { auth: true })

	/**
	 * Get a specific profiling session with its associated files.
	 */
	.get("/:id", async ({ user, params, set }) => {
		const [session] = await db
			.select()
			.from(schema.profilingSession)
			.where(and(
				eq(schema.profilingSession.id, params.id),
				eq(schema.profilingSession.userId, user.id),
			));

		if (!session) {
			set.status = 404;
			return { status: "error", message: "Session not found" };
		}

		// Get associated files
		const filesWithDetails = await db.select({
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
				size: file.size,
			})),
		};
	}, { auth: true });

export { sessionRoutes };
