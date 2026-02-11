import { Elysia, sse, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILE_BYTES, MAX_FILES_PER_SESSION, SSE_EVENTS } from "@shared/constants/file-uploads";

import { db } from "../lib/db";
import { computeSHA256 } from "../lib/hash";
import { authMiddleware } from "../lib/auth";
import { validateFileContent } from "../lib/upload-guard";
import { deleteFile, generateStorageKey, uploadFile } from "../lib/storage";

type UploadedFileRecord = {
	originalName: string;
	mimeType: string;
	size: number;
	storageKey: string;
	fingerprint: string;
};

const sessionRoutes = new Elysia({ prefix: "/api/sessions" })
	.use(authMiddleware)

	/**
	 * Create a profiling session, dedup, validate, hash-check, and upload — all in one request.
	 *
	 * Accepts multipart/form-data with:
	 *   - name, jobDescription, jobTitle (session metadata)
	 *   - hashes: JSON string of hash manifest for batch dedup
	 *   - files: the actual file blobs
	 *
	 * Returns an SSE stream. Session + file DB rows are only inserted
	 * at the very end, in a single batch, on success.
	 *
	 * SSE events:
	 *   1. file:reused          — per duplicate found via hash manifest
	 *   2. file:validating / file:validated / file:uploading / file:done / file:failed / file:hash_mismatch — per new file
	 *   3. session:created      — session ID (emitted near the end, after batch insert)
	 *   4. upload:complete      — final summary
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

			for (const file of rawFiles) {
				if (file.size > MAX_FILE_BYTES) {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { name: file.name, reason: "File too large" } });
					return;
				}
			}

			const fingerprints = hashManifest.map(h => h.sha256);
			const existingFiles = await db.select()
				.from(schema.resumeFile)
				.where(and(
					eq(schema.resumeFile.userId, user.id),
					inArray(schema.resumeFile.fingerprint, fingerprints),
				));

			const lookup = new Map(
				existingFiles.map(f => [`${f.fingerprint}:${f.size}:${f.mimeType}`, f]),
			);

			const reusedNames = new Set<string>();
			const reusedFileIds: string[] = [];

			for (const entry of hashManifest) {
				const existing = lookup.get(`${entry.sha256}:${entry.size}:${entry.mimeType}`);
				if (!existing) continue;

				reusedNames.add(entry.name);
				reusedFileIds.push(existing.id);

				yield sse({
					event: SSE_EVENTS.FILE_REUSED,
					data: { name: entry.name, fileId: existing.id, sha256: entry.sha256 },
				});
			}

			const filesToProcess = rawFiles.filter(f => !reusedNames.has(f.name));

			const uploaded: UploadedFileRecord[] = [];
			const uploadedKeys: string[] = [];
			let totalFailed = 0;

			for (const file of filesToProcess) {
				const fileName = file.name;

				yield sse({
					event: SSE_EVENTS.FILE_VALIDATING,
					data: { name: fileName },
				});

				let data: Uint8Array;
				try {
					data = await file.bytes();
				}
				catch {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { name: fileName, reason: "Failed to read file data" } });
					totalFailed++;
					continue;
				}

				const validation = validateFileContent({ fileName, claimedMimeType: file.type, data });
				if (!validation.ok) {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { name: fileName, reason: validation.message } });
					totalFailed++;
					continue;
				}

				yield sse({ event: SSE_EVENTS.FILE_VALIDATED, data: { name: fileName } });
				const sha256 = computeSHA256(data);
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

				uploaded.push({
					originalName: fileName,
					mimeType: file.type,
					size: data.length,
					storageKey,
					fingerprint: sha256,
				});
				uploadedKeys.push(storageKey);

				yield sse({ event: SSE_EVENTS.FILE_DONE, data: { name: fileName, sha256 } });
			}

			// ── 3. Batch insert: session + files + links ─────────────────
			const confirmedTotal = uploaded.length + reusedFileIds.length;

			if (confirmedTotal === 0) {
				// Nothing succeeded — clean up any R2 uploads (shouldn't be any, but safety)
				for (const key of uploadedKeys) {
					try { await deleteFile(key); } catch { /* best-effort */ }
				}

				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: { sessionId: null, totalConfirmed: 0, totalFailed, totalReused: reusedFileIds.length, status: "failed" },
				});
				return;
			}

			try {
				// Insert session
				const [session] = await db.insert(schema.profilingSession)
					.values({
						userId: user.id,
						name,
						jobDescription,
						jobTitle,
						status: "ready",
						totalFiles: confirmedTotal,
					})
					.returning({ id: schema.profilingSession.id });

				// Insert new file records
				let newFileIds: string[] = [];
				if (uploaded.length > 0) {
					const insertedFiles = await db.insert(schema.resumeFile)
						.values(uploaded.map(f => ({
							userId: user.id,
							originalName: f.originalName,
							mimeType: f.mimeType,
							size: BigInt(f.size),
							storageKey: f.storageKey,
							fingerprint: f.fingerprint,
						})))
						.returning({ id: schema.resumeFile.id });

					newFileIds = insertedFiles.map(f => f.id);
				}

				// Insert session-file links (reused + new)
				const allFileIds = [...reusedFileIds, ...newFileIds];
				if (allFileIds.length > 0) {
					await db.insert(schema.profilingSessionFile)
						.values(allFileIds.map(fileId => ({
							sessionId: session.id,
							fileId,
						})));
				}

				yield sse({ event: SSE_EVENTS.SESSION_CREATED, data: { sessionId: session.id } });

				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: {
						sessionId: session.id,
						totalConfirmed: uploaded.length,
						totalFailed,
						totalReused: reusedFileIds.length,
						status: "ready",
					},
				});
			}
			catch {
				// Batch insert failed — clean up R2 uploads
				for (const key of uploadedKeys) {
					try { await deleteFile(key); } catch { /* best-effort */ }
				}

				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: { sessionId: null, totalConfirmed: 0, totalFailed: totalFailed + uploaded.length, totalReused: 0, status: "failed" },
				});
			}
		},
		{
			auth: true,
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 255 }),
				jobDescription: t.String({ minLength: 1 }),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
				hashes: t.Array(t.Object({
					name: t.String(),
					sha256: t.String(),
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
