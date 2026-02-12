import { Elysia, sse, t } from "elysia";
import { and, desc, eq, inArray } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { type ALLOWED_MIME_TYPES, MAX_FILE_BYTES, MAX_FILES_PER_SESSION, SSE_EVENTS } from "@shared/constants/file-uploads";

import { db } from "~/lib/db";
import { computeSHA256 } from "~/lib/hash";
import { authMiddleware } from "~/lib/auth";
import { validateFileContent, validateFileMetadata } from "~/lib/upload-guard";
import { deleteFile, generateStorageKey, uploadFile } from "~/lib/storage";

type UploadedFileRecord = {
	originalName: string;
	mimeType: string;
	size: number;
	storageKey: string;
	fingerprint: string;
};

type UploadFileResult =
	| { kind: "uploaded"; file: UploadedFileRecord }
	| { kind: "reused"; fileId: number }
	| { kind: "failed" };

type ResolvedLinkItem =
	| { kind: "reused"; fileId: number }
	| { kind: "uploaded"; file: UploadedFileRecord };

async function cleanupUploadedKeys(uploadedKeys: string[]) {
	for (const key of uploadedKeys) {
		try {
			await deleteFile(key);
		}
		catch {
			// Best-effort cleanup.
		}
	}
}

function toFileKey(fingerprint: string | null, mimeType: string | null, size: number | bigint): string {
	return `${fingerprint ?? ""}:${mimeType ?? ""}:${size.toString()}`;
}

const sessionRoutesV1 = new Elysia({ prefix: "/api/v1/sessions" })
	.use(authMiddleware)

	/**
	 * Create a profiling session, dedup, validate, and upload in one request.
	 *
	 * Accepts multipart/form-data with:
	 *   - name, jobDescription, jobTitle (session metadata)
	 *   - hashes: SHA-256 hex strings, index-parallel to files
	 *   - clientIds: client-side numeric IDs, index-parallel to files
	 *   - files: the actual file blobs
	 *
	 * SSE per-file events use `clientId` (the client-side numeric ID).
	 */
	.post(
		"/",
		async function* ({ user, body, request }) {
			const {
				name,
				jobTitle,
				jobDescription,
				hashes,
				clientIds,
				files: rawFiles,
			} = body;

			const isAborted = () => request.signal.aborted;
			const X = () => request.signal.onabort;

			if (hashes.length !== rawFiles.length || clientIds.length !== rawFiles.length) {
				yield sse({ event: SSE_EVENTS.UPLOAD_FAILED, data: { reason: "hashes, clientIds, and files must have the same length" } });
				return;
			}

			let failedMetadataChecks = 0;
			for (let i = 0; i < rawFiles.length; i++) {
				const file = rawFiles[i];
				const check = validateFileMetadata({
					fileName: file.name,
					claimedMimeType: file.type,
					size: file.size,
				});

				if (!check.ok) {
					failedMetadataChecks++;
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId: clientIds[i], reason: check.message } });
				}
			}

			if (failedMetadataChecks > 0) {
				yield sse({
					event: SSE_EVENTS.UPLOAD_FAILED,
					data: { reason: `${failedMetadataChecks} file(s) failed metadata validation` },
				});
				return;
			}

			const existingFiles = await db
				.select({
					id: schema.resumeFile.id,
					fingerprint: schema.resumeFile.fingerprint,
					size: schema.resumeFile.size,
					mimeType: schema.resumeFile.mimeType,
				})
				.from(schema.resumeFile)
				.where(inArray(schema.resumeFile.fingerprint, hashes));

			const lookup = new Map(
				existingFiles.map((f) => [`${f.fingerprint}:${f.size.toString()}:${f.mimeType}`, f.id]),
			);

			const results: UploadFileResult[] = [];
			const uploadedKeys: string[] = [];
			let totalFailed = 0;

			for (let i = 0; i < rawFiles.length; i++) {
				if (isAborted()) {
					await cleanupUploadedKeys(uploadedKeys);
					yield sse({
						event: SSE_EVENTS.UPLOAD_CANCELLED,
						data: { status: "cancelled" },
					});
					return;
				}

				const file = rawFiles[i];
				const clientHash = hashes[i];
				const clientId = clientIds[i];

				const existing = lookup.get(`${clientHash}:${file.size}:${file.type}`);
				if (existing) {
					results.push({ kind: "reused", fileId: existing });
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
					totalFailed++;
					results.push({ kind: "failed" });
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId, reason: "Failed to read file data" } });
					continue;
				}

				if (isAborted()) {
					await cleanupUploadedKeys(uploadedKeys);
					yield sse({
						event: SSE_EVENTS.UPLOAD_CANCELLED,
						data: { status: "cancelled" },
					});
					return;
				}

				const validation = validateFileContent({
					fileName: file.name,
					claimedMimeType: file.type as ALLOWED_MIME_TYPES,
					data,
				});

				if (!validation.ok) {
					totalFailed++;
					results.push({ kind: "failed" });
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId, reason: validation.message } });
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
					totalFailed++;
					results.push({ kind: "failed" });
					yield sse({ event: SSE_EVENTS.FILE_FAILED, data: { clientId, reason: "Failed to upload to storage" } });
					continue;
				}

				const uploadedRecord: UploadedFileRecord = {
					originalName: file.name,
					mimeType: file.type,
					size: data.length,
					storageKey,
					fingerprint: sha256,
				};

				results.push({ kind: "uploaded", file: uploadedRecord });
				uploadedKeys.push(storageKey);
				yield sse({ event: SSE_EVENTS.FILE_DONE, data: { clientId, sha256 } });
			}

			if (isAborted()) {
				await cleanupUploadedKeys(uploadedKeys);
				yield sse({
					event: SSE_EVENTS.UPLOAD_CANCELLED,
					data: { status: "cancelled" },
				});
				return;
			}

			const confirmedTotal = results.filter((r) => r.kind === "uploaded" || r.kind === "reused").length;
			const totalReusedPreTx = results.filter((r) => r.kind === "reused").length;

			if (confirmedTotal === 0) {
				await cleanupUploadedKeys(uploadedKeys);
				yield sse({
					event: SSE_EVENTS.UPLOAD_FAILED,
					data: { sessionId: null, totalConfirmed: 0, totalFailed, totalReused: totalReusedPreTx, status: "failed" },
				});
				return;
			}

			try {
				let sessionId = "";
				let totalReused = 0;
				let totalConfirmedUploaded = 0;
				const redundantUploadedKeys = new Set<string>();
				const linkItems: ResolvedLinkItem[] = results.filter(
					(result): result is ResolvedLinkItem => result.kind === "reused" || result.kind === "uploaded",
				);

				await db.transaction(async (tx) => {
					if (isAborted())
						throw new Error("UPLOAD_ABORTED");

					const [session] = await tx
						.insert(schema.profilingSession)
						.values({
							userId: user.id,
							name,
							jobDescription,
							jobTitle,
							status: "ready",
							totalFiles: confirmedTotal,
						})
						.returning({ id: schema.profilingSession.id });

					sessionId = session.id;

					const uploadedByKey = new Map<string, UploadedFileRecord>();
					for (const item of linkItems) {
						if (item.kind !== "uploaded")
							continue;
						uploadedByKey.set(
							toFileKey(item.file.fingerprint, item.file.mimeType, item.file.size),
							item.file,
						);
					}

					const uploadedKeys = [...uploadedByKey.keys()];
					const uploadedFingerprints = [
						...new Set([...uploadedByKey.values()].map((file) => file.fingerprint)),
					];

					const preExistingFiles = uploadedFingerprints.length === 0
						? []
						: await tx
							.select({
								id: schema.resumeFile.id,
								fingerprint: schema.resumeFile.fingerprint,
								mimeType: schema.resumeFile.mimeType,
								size: schema.resumeFile.size,
							})
							.from(schema.resumeFile)
							.where(inArray(schema.resumeFile.fingerprint, uploadedFingerprints));

					const existingByKey = new Map(
						preExistingFiles.map((file) => [
							`${file.fingerprint ?? ""}:${file.mimeType ?? ""}:${file.size.toString()}`,
							file.id,
						]),
					);

					const toInsert = uploadedKeys
						.filter((key) => !existingByKey.has(key))
						.map((key) => uploadedByKey.get(key))
						.filter((file): file is UploadedFileRecord => Boolean(file));

					if (toInsert.length > 0) {
						await tx
							.insert(schema.resumeFile)
							.values(
								toInsert.map((file) => ({
									userId: user.id,
									originalName: file.originalName,
									mimeType: file.mimeType,
									size: BigInt(file.size),
									storageKey: file.storageKey,
									fingerprint: file.fingerprint,
								})),
							)
							.onConflictDoNothing({ target: schema.resumeFile.fingerprint });
					}

					const resolvedUploadedRows = uploadedFingerprints.length === 0
						? []
						: await tx
							.select({
								id: schema.resumeFile.id,
								fingerprint: schema.resumeFile.fingerprint,
								mimeType: schema.resumeFile.mimeType,
								size: schema.resumeFile.size,
								storageKey: schema.resumeFile.storageKey,
							})
							.from(schema.resumeFile)
							.where(inArray(schema.resumeFile.fingerprint, uploadedFingerprints));

					const resolvedUploadedByKey = new Map(
						resolvedUploadedRows.map((file) => [
							`${file.fingerprint ?? ""}:${file.mimeType ?? ""}:${file.size.toString()}`,
							{ id: file.id, storageKey: file.storageKey },
						]),
					);

					const sessionFileIds = new Set<number>();
					const fileOriginById = new Map<number, "uploaded" | "reused">();
					const insertedStorageKeys = new Set(toInsert.map((file) => file.storageKey));

					for (const item of linkItems) {
						if (item.kind === "reused") {
							sessionFileIds.add(item.fileId);
							fileOriginById.set(item.fileId, "reused");
							continue;
						}

						const key = toFileKey(item.file.fingerprint, item.file.mimeType, item.file.size);
						const resolved = resolvedUploadedByKey.get(key);

						if (!resolved)
							throw new Error("Unable to resolve uploaded file ID after batch insert");

						sessionFileIds.add(resolved.id);

						const alreadyExisted = existingByKey.has(key);
						const insertedByThisRequest = insertedStorageKeys.has(item.file.storageKey)
							&& resolved.storageKey === item.file.storageKey;
						const origin: "uploaded" | "reused" = alreadyExisted || !insertedByThisRequest
							? "reused"
							: "uploaded";

						const prevOrigin = fileOriginById.get(resolved.id);
						if (!prevOrigin || (prevOrigin === "uploaded" && origin === "reused"))
							fileOriginById.set(resolved.id, origin);

						if (origin === "reused")
							redundantUploadedKeys.add(item.file.storageKey);
					}

					totalConfirmedUploaded = [...fileOriginById.values()].filter((origin) => origin === "uploaded").length;
					totalReused = [...fileOriginById.values()].filter((origin) => origin === "reused").length;

					if (isAborted())
						throw new Error("UPLOAD_ABORTED");

					if (sessionFileIds.size > 0) {
						await tx.insert(schema.profilingSessionFile).values(
							[...sessionFileIds].map((fileId) => ({
								sessionId,
								fileId,
							})),
						);
						await tx
							.update(schema.profilingSession)
							.set({ totalFiles: sessionFileIds.size })
							.where(eq(schema.profilingSession.id, sessionId));
					}
				});

				if (redundantUploadedKeys.size > 0)
					await cleanupUploadedKeys([...redundantUploadedKeys]);

				yield sse({ event: SSE_EVENTS.SESSION_CREATED, data: { sessionId } });
				yield sse({
					event: SSE_EVENTS.UPLOAD_COMPLETE,
					data: {
						sessionId,
						totalConfirmed: totalConfirmedUploaded,
						totalFailed,
						totalReused,
						status: "ready",
					},
				});
			}
			catch (error) {
				await cleanupUploadedKeys(uploadedKeys);

				if (error instanceof Error && error.message === "UPLOAD_ABORTED") {
					yield sse({
						event: SSE_EVENTS.UPLOAD_CANCELLED,
						data: { status: "cancelled" },
					});
					return;
				}

				yield sse({
					event: SSE_EVENTS.UPLOAD_FAILED,
					data: { sessionId: null, totalConfirmed: 0, totalFailed, totalReused: 0, status: "failed" },
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
				.where(
					and(
						eq(schema.profilingSession.id, params.id),
						eq(schema.profilingSession.userId, user.id),
					),
				);

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

			// TODO: Trigger actual profiling service here.

			return { status: "ok", message: "Profiling started" };
		},
		{ auth: true },
	)

	/** List all profiling sessions for the authenticated user. */
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

	/** Get a specific profiling session with its associated files. */
		.get(
		"/:id",
		async ({ user, params, set }) => {
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
				set.status = 404;
				return { status: "error", message: "Session not found" };
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
		{ auth: true });

export { sessionRoutesV1 };
