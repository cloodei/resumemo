import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUIDv7 } from "bun";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME ?? "resumemo-uploads";

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
	console.warn("⚠️ R2 credentials not configured. File uploads will fail.");
}

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
export function generateStorageKey(userId: string, originalName: string): string {
	const safeName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_").toLowerCase();
	const uniqueId = randomUUIDv7();
	return `${userId}/${uniqueId}-${safeName}`;
}

/**
 * Generate a presigned URL for direct upload to R2
 */
export async function generateUploadUrl(storageKey: string, contentType: string): Promise<string> {
	const command = new PutObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
		ContentType: contentType,
	});

	// URL valid for 15 minutes
	return getSignedUrl(r2Client, command, { expiresIn: 900 });
}

/**
 * Generate a presigned URL for downloading a file
 */
export async function generateDownloadUrl(storageKey: string): Promise<string> {
	const command = new GetObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
	});

	// URL valid for 1 hour
	return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * Delete a file from R2
 */
export async function deleteFile(storageKey: string): Promise<void> {
	const command = new DeleteObjectCommand({
		Bucket: R2_BUCKET_NAME,
		Key: storageKey,
	});

	await r2Client.send(command);
}

export { r2Client, R2_BUCKET_NAME };
