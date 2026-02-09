import { Elysia, sse, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILE_BYTES, MAX_FILES_PER_SESSION, SSE_EVENTS } from "@shared/constants/file-uploads";

import { db } from "../lib/db";
import { computeXXH64 } from "../lib/hash";
import { authMiddleware } from "../lib/auth";
import { validateFileContent } from "../lib/upload-guard";
import { deleteFile, generateStorageKey, uploadFile } from "../lib/storage";

const sessionRoutes = new Elysia({ prefix: "/api/sessions" })
	.use(authMiddleware)

	/**
	 * Create a new profiling session (metadata only — no files yet).
	 *
	 * Returns the session record so the client can proceed to
	 * the dedup check and upload steps using the session ID.
	 */
	.post(
		"/",
		async ({ user, body }) => {
			const { name, jobTitle, jobDescription } = body;

			const [session] = await db
				.insert(schema.profilingSession)
				.values({
					userId: user.id,
					name,
					jobDescription,
					jobTitle,
					status: "uploading",
					totalFiles: 0,
				})
				.returning();

			return { session };
		},
		{
			auth: true,
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 255 }),
				jobDescription: t.String({ minLength: 1 }),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
			}),
		},
	)

	/**
	 * Pre-check which files already exist for this user (dedup).
	 *
	 * The client sends an array of `{ name, size, mimeType, xxh64 }`.
	 * The server checks the user's existing files by fingerprint+size+mimeType
	 * composite key and returns:
	 *   - `duplicates`:  files that already exist — automatically linked to the session
	 *   - `toUpload`:    files that need uploading
	 */
	.post(
		"/:id/check-duplicates",
		async ({ user, params, body, set }) => {
			// Verify session ownership and state
			const [session] = await db
				.select()
				.from(schema.profilingSession)
				.where(and(
					eq(schema.profilingSession.id, params.id),
					eq(schema.profilingSession.userId, user.id),
				));

			if (!session) {
				set.status = 404;
				return { status: "error" as const, message: "Session not found" };
			}

			if (session.status !== "uploading") {
				set.status = 409;
				return { status: "error" as const, message: "Session is not in uploading state" };
			}

			const { files } = body;

			// Collect all fingerprints to query
			const fingerprints = files.map((f) => f.xxh64);

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

			// Build composite key lookup: xxh64:size:mimeType → existing file
			const existingLookup = new Map(
				existingFiles.map((file) => [
					`${file.fingerprint}:${file.size}:${file.mimeType}`,
					file,
				]),
			);

			const duplicates: { name: string; existingFileId: string }[] = [];
			const toUpload: { name: string }[] = [];

			for (const file of files) {
				const key = `${file.xxh64}:${file.size}:${file.mimeType}`;
				const existing = existingLookup.get(key);

				if (existing) {
					duplicates.push({ name: file.name, existingFileId: existing.id });
				} else {
					toUpload.push({ name: file.name });
				}
			}

			// Link duplicate files to this session
			if (duplicates.length > 0) {
				// Check which are already linked to avoid duplicates in join table
				const existingLinks = await db
					.select({ fileId: schema.profilingSessionFile.fileId })
					.from(schema.profilingSessionFile)
					.where(and(
						eq(schema.profilingSessionFile.sessionId, params.id),
						inArray(
							schema.profilingSessionFile.fileId,
							duplicates.map((d) => d.existingFileId),
						),
					));

				const alreadyLinked = new Set(existingLinks.map((l) => l.fileId));
				const newLinks = duplicates.filter((d) => !alreadyLinked.has(d.existingFileId));

				if (newLinks.length > 0) {
					await db
						.insert(schema.profilingSessionFile)
						.values(newLinks.map((d) => ({
							sessionId: params.id,
							fileId: d.existingFileId,
						})));
				}
			}

			return { status: "ok" as const, duplicates, toUpload };
		},
		{
			auth: true,
			body: t.Object({
				files: t.Array(
					t.Object({
						name: t.String({ minLength: 1, maxLength: 512 }),
						size: t.Number({ minimum: 1, maximum: MAX_FILE_BYTES }),
						mimeType: t.String({ minLength: 1, maxLength: 128 }),
						xxh64: t.String({ minLength: 8, maxLength: 32 }),
					}),
					{ minItems: 1, maxItems: MAX_FILES_PER_SESSION },
				),
			}),
		},
	)

	/**
	 * Upload files to a session via multipart/form-data.
	 *
	 * Returns an SSE stream with per-file status events as each file
	 * is validated, hashed, and uploaded to object storage.
	 *
	 * Pipeline per file:
	 *   1. Read bytes from multipart body
	 *   2. Validate: size, MIME type, extension, magic bytes
	 *   3. Compute authoritative XXH64 hash
	 *   4. Check for duplicates (in case client skipped pre-check)
	 *   5. Upload to R2
	 *   6. Insert DB record + link to session
	 *   7. Emit SSE event with result
	 */
	.post(
		"/:id/upload",
		async function* ({ user, params, body, set }) {
			// Verify session ownership and state
			const [session] = await db
				.select()
				.from(schema.profilingSession)
				.where(and(
					eq(schema.profilingSession.id, params.id),
					eq(schema.profilingSession.userId, user.id),
				));

			if (!session) {
				set.status = 404;
				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: JSON.stringify({
						sessionId: params.id,
						totalConfirmed: 0,
						totalFailed: 0,
						totalReused: 0,
						status: "error",
						message: "Session not found",
					}),
				});
				return;
			}

			if (session.status !== "uploading") {
				set.status = 409;
				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: JSON.stringify({
						sessionId: params.id,
						totalConfirmed: 0,
						totalFailed: 0,
						totalReused: 0,
						status: "error",
						message: "Session is not in uploading state",
					}),
				});
				return;
			}

			// Extract files from multipart body
			const rawFiles = body.files;
			const files: File[] = Array.isArray(rawFiles) ? rawFiles : [rawFiles];

			if (files.length === 0 || files.length > MAX_FILES_PER_SESSION) {
				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: JSON.stringify({
						sessionId: params.id,
						totalConfirmed: 0,
						totalFailed: 0,
						totalReused: 0,
						status: "error",
						message: files.length === 0
							? "No files provided"
							: `Too many files (max ${MAX_FILES_PER_SESSION})`,
					}),
				});
				return;
			}

			let totalConfirmed = 0;
			let totalFailed = 0;
			let totalReused = 0;

			for (let i = 0; i < files.length; i++) {
				const file = files[i];
				const fileName = file.name;

				// ── Step 1: Emit validating event ────────────────────────
				yield sse({
					event: SSE_EVENTS.FILE_VALIDATING,
					data: JSON.stringify({ index: i, name: fileName }),
				});

				// ── Step 2: Read bytes ───────────────────────────────────
				let data: Uint8Array;
				try {
					const arrayBuffer = await file.arrayBuffer();
					data = new Uint8Array(arrayBuffer);
				} catch {
					yield sse({
						event: SSE_EVENTS.FILE_FAILED,
						data: JSON.stringify({
							index: i,
							name: fileName,
							reason: "Failed to read file data",
						}),
					});
					totalFailed++;
					continue;
				}

				// ── Step 3: Validate content ─────────────────────────────
				const validation = validateFileContent({
					fileName,
					claimedMimeType: file.type,
					data,
				});

				if (!validation.ok) {
					yield sse({
						event: SSE_EVENTS.FILE_FAILED,
						data: JSON.stringify({
							index: i,
							name: fileName,
							reason: validation.message,
						}),
					});
					totalFailed++;
					continue;
				}

				yield sse({
					event: SSE_EVENTS.FILE_VALIDATED,
					data: JSON.stringify({ index: i, name: fileName }),
				});

				// ── Step 4: Compute authoritative hash ───────────────────
				const xxh64 = await computeXXH64(data);

				// ── Step 5: Check for server-side dedup ──────────────────
				const compositeKey = `${xxh64}:${data.length}:${file.type}`;

				const [existingFile] = await db
					.select()
					.from(schema.resumeFile)
					.where(and(
						eq(schema.resumeFile.userId, user.id),
						eq(schema.resumeFile.fingerprint, xxh64),
					));

				if (
					existingFile &&
					`${existingFile.fingerprint}:${existingFile.size}:${existingFile.mimeType}` === compositeKey
				) {
					// File already exists — link to session if not already linked
					const [existingLink] = await db
						.select()
						.from(schema.profilingSessionFile)
						.where(and(
							eq(schema.profilingSessionFile.sessionId, params.id),
							eq(schema.profilingSessionFile.fileId, existingFile.id),
						));

					if (!existingLink) {
						await db
							.insert(schema.profilingSessionFile)
							.values({ sessionId: params.id, fileId: existingFile.id });
					}

					yield sse({
						event: SSE_EVENTS.FILE_REUSED,
						data: JSON.stringify({
							index: i,
							name: fileName,
							fileId: existingFile.id,
							xxh64,
						}),
					});
					totalReused++;
					continue;
				}

				// ── Step 6: Upload to R2 ─────────────────────────────────
				yield sse({
					event: SSE_EVENTS.FILE_UPLOADING,
					data: JSON.stringify({ index: i, name: fileName }),
				});

				const storageKey = generateStorageKey(user.id, fileName);

				try {
					await uploadFile(storageKey, data, file.type);
				} catch (err) {
					yield sse({
						event: SSE_EVENTS.FILE_FAILED,
						data: JSON.stringify({
							index: i,
							name: fileName,
							reason: "Failed to upload to storage",
						}),
					});
					totalFailed++;
					continue;
				}

				// ── Step 7: Insert DB record + link to session ───────────
				try {
					const [inserted] = await db
						.insert(schema.resumeFile)
						.values({
							userId: user.id,
							originalName: fileName,
							mimeType: file.type,
							size: BigInt(data.length),
							storageKey,
							fingerprint: xxh64,
						})
						.returning();

					await db
						.insert(schema.profilingSessionFile)
						.values({ sessionId: params.id, fileId: inserted.id });

					yield sse({
						event: SSE_EVENTS.FILE_DONE,
						data: JSON.stringify({
							index: i,
							name: fileName,
							fileId: inserted.id,
							xxh64,
						}),
					});
					totalConfirmed++;
				} catch (err) {
					// Rollback: delete from R2 since DB insert failed
					try { await deleteFile(storageKey); } catch { /* best-effort */ }

					yield sse({
						event: SSE_EVENTS.FILE_FAILED,
						data: JSON.stringify({
							index: i,
							name: fileName,
							reason: "Failed to save file record",
						}),
					});
					totalFailed++;
				}
			}

			// ── Finalize session ─────────────────────────────────────────
			const confirmedTotal = totalConfirmed + totalReused;

			if (confirmedTotal === 0) {
				await db
					.update(schema.profilingSession)
					.set({
						status: "failed",
						totalFiles: 0,
						errorMessage: "No files were uploaded successfully",
					})
					.where(eq(schema.profilingSession.id, params.id));

				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: JSON.stringify({
						sessionId: params.id,
						totalConfirmed,
						totalFailed,
						totalReused,
						status: "failed",
						message: "No files were uploaded successfully",
					}),
				});
				return;
			}

			await db
				.update(schema.profilingSession)
				.set({
					status: "ready",
					totalFiles: confirmedTotal,
				})
				.where(eq(schema.profilingSession.id, params.id));

			yield sse({
				event: SSE_EVENTS.UPLOAD_COMPLETE,
				data: JSON.stringify({
					sessionId: params.id,
					totalConfirmed,
					totalFailed,
					totalReused,
					status: "ready",
				}),
			});
		},
		{
			auth: true,
			body: t.Object({
				files: t.Union([
					t.File({ maxSize: MAX_FILE_BYTES }),
					t.Array(t.File({ maxSize: MAX_FILE_BYTES }), { maxItems: MAX_FILES_PER_SESSION }),
				]),
			}),
		},
	)

	/**
	 * Cancel and clean up an uploading session.
	 *
	 * Removes all session-file links, deletes orphaned files from R2 + DB,
	 * and deletes the session record. Returns confirmation to the client.
	 */
	.post(
		"/:id/cancel",
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

			if (session.status !== "uploading") {
				set.status = 409;
				return { status: "error", message: "Only uploading sessions can be cancelled" };
			}

			// Get all files linked to this session
			const sessionFiles = await db
				.select({ fileId: schema.profilingSessionFile.fileId })
				.from(schema.profilingSessionFile)
				.where(eq(schema.profilingSessionFile.sessionId, params.id));

			// Delete all join records for this session
			await db
				.delete(schema.profilingSessionFile)
				.where(eq(schema.profilingSessionFile.sessionId, params.id));

			// Clean up orphaned files (not referenced by any other session)
			for (const { fileId } of sessionFiles) {
				const otherRefs = await db
					.select({ id: schema.profilingSessionFile.id })
					.from(schema.profilingSessionFile)
					.where(eq(schema.profilingSessionFile.fileId, fileId));

				if (otherRefs.length === 0) {
					const [file] = await db
						.select()
						.from(schema.resumeFile)
						.where(eq(schema.resumeFile.id, fileId));

					if (file) {
						try { await deleteFile(file.storageKey); } catch { /* best-effort */ }
						await db
							.delete(schema.resumeFile)
							.where(eq(schema.resumeFile.id, fileId));
					}
				}
			}

			// Delete the session itself
			await db
				.delete(schema.profilingSession)
				.where(eq(schema.profilingSession.id, params.id));

			return { status: "cancelled" };
		},
		{ auth: true },
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
