import { Elysia, sse, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { type ALLOWED_MIME_TYPES, MAX_FILE_BYTES, MAX_FILES_PER_SESSION, SSE_EVENTS } from "@shared/constants/file-uploads";

import { db } from "../lib/db";
import { computeSHA256 } from "../lib/hash";
import { authMiddleware } from "../lib/auth";
import { validateFileContent, validateFileMetadata } from "../lib/upload-guard";
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
	 *   - hashes: SHA-256 hex strings, index-parallel to files
	 *   - clientIds: client-side numeric IDs, index-parallel to files
	 *   - files: the actual file blobs
	 *
	 * Returns an SSE stream. Session + file DB rows are only inserted
	 * at the very end, in a single batch, on success.
	 *
	 * SSE events use `clientId` (the client-side numeric ID) to refer to files.
	 */
	.post(
		"/",
		async function* ({ user, body }) {
			const {
				name,
				jobTitle,
				jobDescription,
				hashes,
				clientIds,
				files: rawFiles
			} = body;

			if (hashes.length !== rawFiles.length || clientIds.length !== rawFiles.length) {
				yield sse({ event: SSE_EVENTS.UPLOAD_FAILED, data: { reason: "hashes, clientIds, and files must have the same length" } });
				return;
			}

			let failcheck = 0;
			for (let i = 0; i < rawFiles.length; i++) {
				const file = rawFiles[i];
				const check = validateFileMetadata({
					fileName: file.name,
					claimedMimeType: file.type,
					size: file.size,
				});
				if (!check.ok) {
					failcheck++;
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId: clientIds[i], reason: check.message } });
				}
			}

			if (failcheck > 0) {
				yield sse({
					event: SSE_EVENTS.UPLOAD_FAILED,
					data: { reason: `${failcheck} file(s) failed metadata validation` },
				});
				return;
			}

			const existingFiles = await db.select()
				.from(schema.resumeFile)
				.where(and(
					eq(schema.resumeFile.userId, user.id),
					inArray(schema.resumeFile.fingerprint, hashes),
				))

			const lookup = new Map(
				existingFiles.map(f => [`${f.fingerprint}:${f.size}:${f.mimeType}`, f.id]),
			);

			const reusedFileIds: number[] = [];
			const uploaded: UploadedFileRecord[] = [];
			const uploadedKeys: string[] = [];
			let totalFailed = 0;

			for (let i = 0; i < rawFiles.length; i++) {
				const file = rawFiles[i];
				const clientHash = hashes[i];
				const clientId = clientIds[i];

				const existing = lookup.get(`${clientHash}:${file.size}:${file.type}`);
				if (existing) {
					reusedFileIds.push(existing);
					yield sse({
						event: SSE_EVENTS.FILE_REUSED,
						data: { clientId, fileId: existing, sha256: clientHash },
					});
					continue;
				}

				yield sse({ event: SSE_EVENTS.FILE_VALIDATING, data: { clientId } });

				let data: Uint8Array;
				try {
					data = await file.bytes();
				}
				catch {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId, reason: "Failed to read file data" } });
					totalFailed++;
					continue;
				}

				const validation = validateFileContent({ fileName: file.name, claimedMimeType: file.type as ALLOWED_MIME_TYPES, data });
				if (!validation.ok) {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId, reason: validation.message } });
					totalFailed++;
					continue;
				}

				yield sse({ event: SSE_EVENTS.FILE_VALIDATED, data: { clientId } });
				const sha256 = computeSHA256(data);
				yield sse({ event: SSE_EVENTS.FILE_UPLOADING, data: { clientId } });

				const storageKey = generateStorageKey(user.id, file.name);
				try {
					await uploadFile(storageKey, data, file.type);
				}
				catch {
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId, reason: "Failed to upload to storage" } });
					totalFailed++;
					continue;
				}

				uploaded.push({
					originalName: file.name,
					mimeType: file.type,
					size: data.length,
					storageKey,
					fingerprint: sha256,
				});
				uploadedKeys.push(storageKey);

				yield sse({ event: SSE_EVENTS.FILE_DONE, data: { clientId, sha256 } });
			}

			// ── 3. Batch insert: session + files + links ─────────────────
			const confirmedTotal = uploaded.length + reusedFileIds.length;

			if (confirmedTotal === 0) {
				// Nothing succeeded — clean up any R2 uploads (shouldn't be any, but safety)
				for (const key of uploadedKeys) {
					try { await deleteFile(key); } catch { /* best-effort */ }
				}

				yield sse({
					event: SSE_EVENTS.UPLOAD_FAILED,
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
				let newFileIds: number[] = [];
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
					await db
						.insert(schema.profilingSessionFile)
						.values(allFileIds.map(fileId => ({
							sessionId: session.id,
							fileId,
						})));
				}

				yield sse({ event: SSE_EVENTS.SESSION_CREATED, data: { sessionId: session.id } });

				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: {
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
					event: SSE_EVENTS.UPLOAD_FAILED,
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
				hashes: t.Array(t.String()),
				clientIds: t.Array(t.Number()),
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
