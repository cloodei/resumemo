import { randomUUIDv7 } from "bun";
import { createHmac, timingSafeEqual } from "node:crypto";
import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { MAX_FILES_PER_SESSION, MAX_TOTAL_BYTES } from "@shared/constants/file-uploads";

import { db } from "~/lib/db";
import { authMiddleware } from "~/lib/auth";
import { validateFileMetadata } from "~/lib/upload-guard";
import {
	deleteFile,
	generatePresignedUploadUrl,
	generateStorageKey,
	headFile,
} from "~/lib/storage";

type PendingUploadFile = {
	clientId: number;
	fileName: string;
	mimeType: string;
	size: number;
	storageKey: string;
};

type PendingSession = {
	uploadId: string;
	userId: string;
	name: string;
	jobDescription: string;
	jobTitle?: string;
	files: PendingUploadFile[];
};

type UploadIntentClaims = PendingSession;

function getUploadIntentSecret() {
	const secret = process.env.UPLOAD_INTENT_SECRET ?? process.env.BETTER_AUTH_SECRET ?? process.env.JWT_SECRET;
	if (!secret)
		throw new Error("UPLOAD_INTENT_SECRET (or BETTER_AUTH_SECRET/JWT_SECRET fallback) is required");

	return secret;
}

function encodeBase64Url(value: string) {
	return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string) {
	return Buffer.from(value, "base64url").toString("utf8");
}

function signUploadIntent(claims: UploadIntentClaims) {
	const secret = getUploadIntentSecret();
	const payload = encodeBase64Url(JSON.stringify(claims));
	const signature = createHmac("sha256", secret).update(payload).digest("base64url");
	return `${payload}.${signature}`;
}

function verifyUploadIntent(token: string) {
	const parts = token.split(".");
	if (parts.length !== 2)
		return null;

	const [payload, signature] = parts;
	const expectedSignature = createHmac("sha256", getUploadIntentSecret()).update(payload).digest("base64url");
	const given = Buffer.from(signature);
	const expected = Buffer.from(expectedSignature);

	if (given.length !== expected.length || !timingSafeEqual(given, expected))
		return null;

	try {
		const claims = JSON.parse(decodeBase64Url(payload)) as UploadIntentClaims;
		return claims;
	}
	catch {
		return null;
	}
}

async function cleanupUploadedKeys(storageKeys: string[]) {
	// for (const storageKey of storageKeys) {
	// 	try {
	// 		await deleteFile(storageKey);
	// 	}
	// 	catch {
	// 		// Best-effort cleanup.
	// 	}
	// }
  await Promise.all(storageKeys.map(async (storageKey) => {
    try { await deleteFile(storageKey) }
    catch { /* Best-effort cleanup */ }
  }));
}

const sessionRoutesV2 = new Elysia({ prefix: "/api/v2/sessions" })
	.use(authMiddleware)
	.post(
		"/init",
		async ({ user, body, set }) => {
			const { name, jobDescription, jobTitle, files } = body;

			if (files.length === 0) {
				set.status = 400;
				return { status: "error", message: "At least one file is required" };
			}

			const distinctClientIds = new Set(files.map((file) => file.clientId));
			if (distinctClientIds.size !== files.length) {
				set.status = 400;
				return { status: "error", message: "Each file must have a unique clientId" };
			}

			const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
			if (totalBytes > MAX_TOTAL_BYTES) {
				set.status = 400;
				return {
					status: "error",
					message: `Total upload size exceeds limit (${MAX_TOTAL_BYTES} bytes)`,
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
				.filter((issue): issue is { clientId: number; reason: string } => issue !== null);

			if (metadataErrors.length > 0) {
				set.status = 400;
				return {
					status: "error",
					message: "One or more files failed metadata validation",
					errors: metadataErrors,
				};
			}

			const uploadId = randomUUIDv7();

			const pendingFiles: PendingUploadFile[] = files.map((file) => ({
				clientId: file.clientId,
				fileName: file.fileName,
				mimeType: file.mimeType,
				size: file.size,
				storageKey: generateStorageKey(user.id, file.fileName),
			}));

			const claims: UploadIntentClaims = {
				uploadId,
				userId: user.id,
				name,
				jobDescription,
				jobTitle,
				files: pendingFiles,
			};

			const intentToken = signUploadIntent(claims);

			const uploads = await Promise.all(
				pendingFiles.map(async (file) => ({
					clientId: file.clientId,
					storageKey: file.storageKey,
					uploadUrl: await generatePresignedUploadUrl(file.storageKey, file.mimeType),
					method: "PUT" as const,
					headers: {
						"Content-Type": file.mimeType,
					},
				})),
			);

			return {
				status: "ok",
				uploadId,
				intentToken,
				uploads,
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
		"/:uploadId/finish",
		async ({ user, params, body, set }) => {
			const claims = verifyUploadIntent(body.intentToken);
			if (!claims || claims.uploadId !== params.uploadId || claims.userId !== user.id) {
				set.status = 401;
				return { status: "error", message: "Invalid upload intent" };
			}

			const failures: Array<{ clientId: number; reason: string }> = [];
			for (const pendingFile of claims.files) {
				try {
					const head = await headFile(pendingFile.storageKey);
					const size = Number(head.ContentLength ?? 0);
					const mimeType = head.ContentType ?? pendingFile.mimeType;
					const check = validateFileMetadata({
						fileName: pendingFile.fileName,
						claimedMimeType: mimeType,
						size,
					});

					if (!check.ok) {
						failures.push({
							clientId: pendingFile.clientId,
							reason: check.message,
						});
					}
				}
				catch {
					failures.push({
						clientId: pendingFile.clientId,
						reason: "Uploaded object is missing or unreadable",
					});
				}
			}

			if (failures.length > 0) {
				const storageKeys = claims.files.map((file) => file.storageKey);
				await cleanupUploadedKeys(storageKeys);

				set.status = 400;
				return {
					status: "error",
					message: "Final upload verification failed",
					failures,
				};
			}

			let sessionId = "";
			await db.transaction(async (tx) => {
				const [createdSession] = await tx
					.insert(schema.profilingSession)
					.values({
						userId: user.id,
						name: claims.name,
						jobDescription: claims.jobDescription,
						jobTitle: claims.jobTitle,
						status: "ready",
						totalFiles: claims.files.length,
					})
					.returning({ id: schema.profilingSession.id });

				sessionId = createdSession.id;

				const insertedFiles = await tx
					.insert(schema.resumeFile)
					.values(
						claims.files.map((file) => ({
							userId: user.id,
							originalName: file.fileName,
							mimeType: file.mimeType,
							size: BigInt(file.size),
							storageKey: file.storageKey,
							fingerprint: null,
						})),
					)
					.returning({ id: schema.resumeFile.id });

				if (insertedFiles.length > 0) {
					await tx.insert(schema.profilingSessionFile).values(
						insertedFiles.map((file) => ({
							sessionId,
							fileId: file.id,
						})),
					);
				}

				if (insertedFiles.length !== claims.files.length) {
					await tx
						.update(schema.profilingSession)
						.set({
							totalFiles: insertedFiles.length,
						})
						.where(eq(schema.profilingSession.id, sessionId));
				}
			});

			return {
				status: "ready",
				sessionId,
				totalConfirmed: claims.files.length,
			};
		},
		{
			auth: true,
			body: t.Object({
				intentToken: t.String({ minLength: 1 }),
			}),
		},
	)
	.post(
		"/:uploadId/cancel",
		async ({ user, params, body }) => {
			const claims = verifyUploadIntent(body.intentToken);
			if (!claims || claims.uploadId !== params.uploadId || claims.userId !== user.id)
				return { status: "ok", message: "Nothing pending to cancel" };

			await cleanupUploadedKeys(claims.files.map((file) => file.storageKey));

			return { status: "ok", message: "Upload batch cancelled" };
		},
		{
			auth: true,
			body: t.Object({
				intentToken: t.String({ minLength: 1 }),
			}),
		},
	);

export { sessionRoutesV2 };
