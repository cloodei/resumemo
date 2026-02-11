import { Elysia, sse, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILE_BYTES, MAX_FILES_PER_SESSION, SSE_EVENTS } from "@shared/constants/file-uploads";

import { db } from "../lib/db";
import { computeXXH64 } from "../lib/hash";
import { authMiddleware } from "../lib/auth";
import { validateFileContent } from "../lib/upload-guard";
import { deleteFile, generateStorageKey, uploadFile } from "../lib/storage";

/**
 * Hash manifest entry sent by the client alongside the files.
 * Used for batch dedup before touching any file bytes.
 */
// type HashEntry = { name: string; size: number; mimeType: string; xxh64: string };

const sessionRoutes = new Elysia({ prefix: "/api/sessions" })
	.use(authMiddleware)

	/**
	 * Create a profiling session, dedup, and upload — all in one request.
	 *
	 * Accepts multipart/form-data with:
	 *   - name, jobDescription, jobTitle (session metadata)
	 *   - hashes: JSON string of `HashEntry[]` for batch dedup
	 *   - files: the actual file blobs
	 *
	 * Returns an SSE stream:
	 *   1. session:created   — session ID
	 *   2. file:reused       — per duplicate found via hash manifest
	 *   3. file:validating / file:validated / file:uploading / file:done / file:failed — per new file
	 *   4. upload:complete   — final summary
	 */
	.post(
		"/",
		async function* ({ user, body }) {
			const {
				name,
				jobTitle,
				jobDescription,
				hashes: hashManifest,
				files: rawFiles
			} = body;

			const fingerprints = hashManifest.map(h => h.hash);
			const [[session], existingFiles] = await Promise.all([
				db.insert(schema.profilingSession)
					.values({
						userId: user.id,
						name,
						jobDescription,
						jobTitle: jobTitle || undefined,
						status: "uploading",
						totalFiles: 0,
					})
					.returning({ id: schema.profilingSession.id }),
				db.select()
					.from(schema.resumeFile)
					.where(and(
						eq(schema.resumeFile.userId, user.id),
						inArray(schema.resumeFile.fingerprint, fingerprints),
					))
			]);

			yield sse({
				event: SSE_EVENTS.SESSION_CREATED,
				data: { sessionId: session.id },
			});

			// Build a set of file names that were matched as duplicates
			const reusedNames = new Set<string>();
			let totalReused = 0;

			// composite key lookup: xxh64:size:mimeType → existing file
			const lookup = new Map(
				existingFiles.map(f => [`${f.fingerprint}:${f.size}:${f.mimeType}`, f]),
			);

			const linksToInsert: { sessionId: string; fileId: string }[] = [];

			for (const entry of hashManifest) {
				const existing = lookup.get(`${entry.hash}:${entry.size}:${entry.mimeType}`);
				if (!existing) continue;

				reusedNames.add(entry.name);
				linksToInsert.push({ sessionId: session.id, fileId: existing.id });

				yield sse({
					event: SSE_EVENTS.FILE_REUSED,
					data: { name: entry.name, fileId: existing.id, xxh64: entry.hash },
				});
				totalReused++;
			}

			if (linksToInsert.length > 0) {
				await db
					.insert(schema.profilingSessionFile)
					.values(linksToInsert);
			}

			// const files: File[] = rawFiles ? (Array.isArray(rawFiles) ? rawFiles : [rawFiles]) : [];
			const filesToProcess = rawFiles.filter(f => !reusedNames.has(f.name));

			let totalConfirmed = 0, totalFailed = 0;
			for (let i = 0; i < filesToProcess.length; i++) {
				const file = filesToProcess[i];
				const fileName = file.name;

				yield sse({
					event: SSE_EVENTS.FILE_VALIDATING,
					data: { name: fileName },
				});

				// Read bytes
				let data: Uint8Array;
				try {
					data = await file.bytes();
				}
				catch {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { name: fileName, reason: "Failed to read file data" } });
					totalFailed++;
					continue;
				}

				// Validate content (size, mime, extension, magic bytes)
				const validation = validateFileContent({ fileName, claimedMimeType: file.type, data });
				if (!validation.ok) {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { name: fileName, reason: validation.message } });
					totalFailed++;
					continue;
				}

				yield sse({ event: SSE_EVENTS.FILE_VALIDATED, data: { name: fileName } });

				// Compute authoritative hash
				const xxh64 = await computeXXH64(data);

				// Server-side dedup (catches anything the client manifest missed)
				// const [existingFile] = await db
				// 	.select()
				// 	.from(schema.resumeFile)
				// 	.where(and(
				// 		eq(schema.resumeFile.userId, user.id),
				// 		eq(schema.resumeFile.fingerprint, xxh64),
				// 	));

				// if (
				// 	existingFile &&
				// 	`${existingFile.fingerprint}:${existingFile.size}:${existingFile.mimeType}` ===
				// 	`${xxh64}:${data.length}:${file.type}`
				// ) {
				// 	const [existingLink] = await db
				// 		.select()
				// 		.from(schema.profilingSessionFile)
				// 		.where(and(
				// 			eq(schema.profilingSessionFile.sessionId, session.id),
				// 			eq(schema.profilingSessionFile.fileId, existingFile.id),
				// 		));

				// 	if (!existingLink) {
				// 		await db.insert(schema.profilingSessionFile).values({ sessionId: session.id, fileId: existingFile.id });
				// 	}

				// 	yield sse({ event: SSE_EVENTS.FILE_REUSED, data: { name: fileName, fileId: existingFile.id, xxh64 } });
				// 	totalReused++;
				// 	continue;
				// }

				// Upload to R2
				yield sse({ event: SSE_EVENTS.FILE_UPLOADING, data: { name: fileName } });

				const storageKey = generateStorageKey(user.id, fileName);

				try {
					await uploadFile(storageKey, data, file.type);
				}
				catch {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { name: fileName, reason: "Failed to upload to storage" } });
					totalFailed++;
					continue;
				}

				// Insert DB record + link to session
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
						.values({ sessionId: session.id, fileId: inserted.id });

					yield sse({ event: SSE_EVENTS.FILE_DONE, data: { name: fileName, fileId: inserted.id, xxh64 } });
					totalConfirmed++;
				}
				catch {
					try {
						await deleteFile(storageKey);
					}
					catch { /* best-effort */ }
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { name: fileName, reason: "Failed to save file record" } });
					totalFailed++;
				}
			}

			// ── 4. Finalize session ───────────────────────────────────
			const confirmedTotal = totalConfirmed + totalReused;

			if (confirmedTotal === 0) {
				await db
					.update(schema.profilingSession)
					.set({ status: "failed", totalFiles: 0, errorMessage: "No files were uploaded successfully" })
					.where(eq(schema.profilingSession.id, session.id));

				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: { sessionId: session.id, totalConfirmed, totalFailed, totalReused, status: "failed" },
				});
				return;
			}

			await db
				.update(schema.profilingSession)
				.set({ status: "ready", totalFiles: confirmedTotal })
				.where(eq(schema.profilingSession.id, session.id));

			yield sse({
				event: SSE_EVENTS.UPLOAD_COMPLETE,
				data: { sessionId: session.id, totalConfirmed, totalFailed, totalReused, status: "ready" },
			});
		},
		{
			auth: true,
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 255 }),
				jobDescription: t.String({ minLength: 1 }),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
				hashes: t.Array(t.Object({
					name: t.String(),
					hash: t.String(),
					size: t.Number(),
					mimeType: t.String(),
				})),
				files: t.Files({
					maxSize: MAX_FILE_BYTES,
					maxItems: MAX_FILES_PER_SESSION,
					minItems: 1,
				}),
			}),
		},
	)

	/**
	 * Cancel and clean up an uploading session.
	 *
	 * Removes all session-file links, deletes orphaned files from R2 + DB,
	 * and deletes the session record.
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
						await db.delete(schema.resumeFile).where(eq(schema.resumeFile.id, fileId));
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

	/** List all profiling sessions for the authenticated user. */
	.get("/", async ({ user }) => {
		const sessions = await db
			.select()
			.from(schema.profilingSession)
			.where(eq(schema.profilingSession.userId, user.id))
			.orderBy(desc(schema.profilingSession.createdAt));

		return { sessions };
	}, { auth: true })

	/** Get a specific profiling session with its associated files. */
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
				size: Number(file.size),
			})),
		};
	}, { auth: true });

export { sessionRoutes };
