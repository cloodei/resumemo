import { Elysia, t } from "elysia";

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
	.post(
		"/presign",
		async ({ user, body, set }) => {
			const { files } = body;

			const distinctClientIds = new Set(files.map((file) => file.clientId));
			if (distinctClientIds.size !== files.length) {
				set.status = 400;
				return {
					status: "error",
					message: "Each file must have a unique clientId",
					errors: null
				};
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
				set.status = 400;
				return {
					status: "error",
					message: "Metadata validation failed",
					errors: metadataErrors,
				};
			}

			const uploads = await Promise.all(
				files.map(async (file) => {
					const storageKey = generateStorageKey(user.id, file.fileName);
					return {
						clientId: file.clientId,
						storageKey,
						uploadUrl: await generatePresignedUploadUrl(storageKey, file.mimeType),
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
	// Step 2: Verify uploads landed in R2, then create session + file records
	.post(
		"/create",
		async ({ user, body, set }) => {
			const { name, jobDescription, jobTitle, files } = body;

			if (files.length === 0) {
				set.status = 400;
				return { status: "error", message: "At least one file is required" };
			}

			// Verify every storageKey belongs to this user (keys are userId/…)
			for (const file of files) {
				if (!file.storageKey.startsWith(`${user.id}/`)) {
					set.status = 403;
					return { status: "error", message: "Storage key does not belong to this user" };
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

				set.status = 400;
				return {
					status: "error",
					message: "Upload verification failed",
					failures,
				};
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
								// fingerprint: null,
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

				// if (insertedFiles.length !== files.length) {
				// 	await tx
				// 		.update(schema.profilingSession)
				// 		.set({ totalFiles: insertedFiles.length })
				// 		.where(eq(schema.profilingSession.id, sessionId));
				// }
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
				jobDescription: t.String({ minLength: 1 }),
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
	);
