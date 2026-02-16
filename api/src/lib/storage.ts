import { randomUUIDv7 } from "bun";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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
 * Upload a file buffer directly to R2.
 *
 * This replaces the old presigned-URL flow — the server now receives
 * the file bytes and performs the upload itself.
 */
async function uploadFile(storageKey: string, body: Buffer | string | Uint8Array, contentType: string) {
	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
		Body: body,
		ContentType: contentType,
	});

	await r2Client.send(command);
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
		...(contentLength != null ? { ContentLength: contentLength } : {}),
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

export {
	r2Client,
	R2_BUCKET_NAME,
	generateStorageKey,
	uploadFile,
	generatePresignedUploadUrl,
	deleteFile,
	headFile,
};
