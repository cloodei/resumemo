import { randomUUIDv7 } from "bun";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { validateFileMetadata } from "./upload-guard";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "resumemo-uploads";

const r2Client = new S3Client({
	region: "auto",
	endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: R2_ACCESS_KEY_ID ?? "",
		secretAccessKey: R2_SECRET_ACCESS_KEY ?? "",
	},
});

/**
 * Generate a unique storage key for a file.
 * Format: `userId/uuid-sanitized_filename`
 */
function generateStorageKey(userId: string, originalName: string) {
	const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
	const uniqueId = randomUUIDv7();
	return `${userId}/${uniqueId}-${safeName}`;
}

/**
 * Generate a short-lived presigned URL for direct browser upload.
 *
 * When `contentLength` is provided the signed URL will include a
 * Content-Length condition so R2 rejects uploads that don't match
 * the declared size — prevents oversized uploads at the storage level.
 */
function generatePresignedUploadUrl(
	storageKey: string,
	contentType: string,
	contentLength?: number,
) {
	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
		ContentType: contentType,
		...(contentLength ? { ContentLength: contentLength } : {}),
	});

	return getSignedUrl(r2Client, command, { expiresIn: 60 * 15 });
}

/**
 * Delete a file from R2.
 */
async function deleteFile(storageKey: string) {
	const command = new DeleteObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
	});

	await r2Client.send(command);
}

/**
 * Fetch metadata for an uploaded object.
 */
function headFile(storageKey: string) {
	const command = new HeadObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
	});

	return r2Client.send(command);
}

async function cleanupUploadedKeys(storageKeys: string[]) {
	await Promise.all(storageKeys.map(async (storageKey) => {
		try {
			await deleteFile(storageKey);
		}
		catch {
			// Best-effort cleanup.
		}
	}));
}

type ConfirmedUpload = {
	storageKey: string;
	fileName: string;
	mimeType: string;
	size: number;
};

async function verifyUploads(files: ConfirmedUpload[]) {
	const headResults = await Promise.all(
		files.map(async (file) => {
			try {
				const head = await headFile(file.storageKey);
				const size = head.ContentLength ?? 0;
				const mimeType = head.ContentType ?? "bad";
				const check = validateFileMetadata({
					fileName: file.fileName,
					claimedMimeType: mimeType,
					size,
				});

				if (!check.ok)
					return { storageKey: file.storageKey, reason: check.message };

				return null;
			}
			catch {
				return {
					storageKey: file.storageKey,
					reason: "Uploaded object is missing or unreadable",
				};
			}
		}),
	);

	return headResults.filter(
		(result): result is { storageKey: string; reason: string } => result !== null,
	);
}

export {
	r2Client,
	R2_BUCKET_NAME,
	generateStorageKey,
	generatePresignedUploadUrl,
	deleteFile,
	headFile,
	cleanupUploadedKeys,
	verifyUploads
};
