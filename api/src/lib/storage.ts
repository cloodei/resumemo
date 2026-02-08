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
 * Generate a unique storage key for a file
 * Format: userId/uuid-filename
 */
function generateStorageKey(userId: string, originalName: string) {
	const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
	const uniqueId = randomUUIDv7();
	return `${userId}/${uniqueId}-${safeName}`;
}

/**
 * Generate a presigned URL for direct upload to R2
 */
function generateUploadUrl(storageKey: string, contentType: string) {
	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
		ContentType: contentType,
	});

	return getSignedUrl(r2Client, command, { expiresIn: 900 });
}

/**
 * Delete a file from R2
 */
async function deleteFile(storageKey: string) {
	const command = new DeleteObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
	});

	await r2Client.send(command);
}

/**
 * Fetch metadata for an uploaded object
 */
async function headFile(storageKey: string) {
	const command = new HeadObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
	});

	return r2Client.send(command);
}

export { r2Client, R2_BUCKET_NAME, generateStorageKey, generateUploadUrl, deleteFile, headFile };
