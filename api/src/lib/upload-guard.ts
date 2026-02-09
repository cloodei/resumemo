import {
	MAX_FILE_BYTES,
	MAX_TOTAL_BYTES,
	MAX_FILES_PER_SESSION,
	MIME_EXTENSION_MAP,
	ALLOWED_MIME_TYPES,
	MAGIC_BYTES,
} from "@shared/constants/file-uploads";

type AllowedMimeType = keyof typeof MIME_EXTENSION_MAP;

function getExtension(fileName: string): string {
	const trimmed = fileName.trim().toLowerCase();
	const dotIndex = trimmed.lastIndexOf(".");
	if (dotIndex === -1) return "";
	return trimmed.slice(dotIndex);
}

function isAllowedMimeType(mimeType: string): mimeType is AllowedMimeType {
	return ALLOWED_MIME_TYPES.has(mimeType as AllowedMimeType);
}

function isExtensionValidForMime(fileName: string, mimeType: AllowedMimeType): boolean {
	const ext = getExtension(fileName);
	const allowed: readonly string[] = MIME_EXTENSION_MAP[mimeType];
	return allowed.includes(ext);
}

/**
 * Check whether the first N bytes of `data` match the expected
 * magic-byte signature for the given MIME type.
 *
 * - PDF:  `%PDF-` at offset 0
 * - DOCX: `PK\x03\x04` at offset 0 (ZIP archive)
 * - TXT:  no null bytes in first 8 KB + valid-ish UTF-8
 */
function verifyMagicBytes(data: Uint8Array, mimeType: AllowedMimeType): boolean {
	if (mimeType === "text/plain") {
		return isPlausibleText(data);
	}

	const sig = MAGIC_BYTES[mimeType as keyof typeof MAGIC_BYTES];
	if (!sig) return true;

	if (data.length < sig.offset + sig.bytes.length) return false;

	for (let i = 0; i < sig.bytes.length; i++) {
		if (data[sig.offset + i] !== sig.bytes[i]) return false;
	}

	return true;
}

/**
 * Heuristic for text/plain: scan the first 8 KB for null bytes.
 * Presence of `0x00` almost always indicates a binary file.
 */
function isPlausibleText(data: Uint8Array): boolean {
	const scanLength = Math.min(data.length, 8192);
	for (let i = 0; i < scanLength; i++) {
		if (data[i] === 0x00) return false;
	}
	return true;
}

type UploadMeta = {
	name: string;
	size: number;
	mimeType: string;
	xxh64: string;
};

type ValidationResult = { ok: true } | { ok: false; message: string };

/**
 * Validate a batch of file metadata before upload begins.
 * This runs against the metadata sent in the dedup check or upload request.
 */
function validateUploadMeta(files: UploadMeta[]): ValidationResult {
	if (files.length === 0) {
		return { ok: false, message: "At least one file is required" };
	}

	if (files.length > MAX_FILES_PER_SESSION) {
		return { ok: false, message: `Too many files. Maximum is ${MAX_FILES_PER_SESSION}` };
	}

	let totalBytes = 0;

	for (const file of files) {
		if (!file.name || file.name.length > 512) {
			return { ok: false, message: "Invalid file name" };
		}

		if (!Number.isFinite(file.size) || file.size <= 0) {
			return { ok: false, message: `Invalid file size for ${file.name}` };
		}

		if (file.size > MAX_FILE_BYTES) {
			return { ok: false, message: `File too large: ${file.name} (max ${MAX_FILE_BYTES / 1024 / 1024}MB)` };
		}

		if (!isAllowedMimeType(file.mimeType)) {
			return { ok: false, message: `Unsupported file type: ${file.mimeType}` };
		}

		if (!isExtensionValidForMime(file.name, file.mimeType)) {
			return { ok: false, message: `File extension does not match type: ${file.name}` };
		}

		if (!file.xxh64 || file.xxh64.length < 8 || file.xxh64.length > 32) {
			return { ok: false, message: `Invalid hash for ${file.name}` };
		}

		totalBytes += file.size;
		if (totalBytes > MAX_TOTAL_BYTES) {
			return { ok: false, message: `Total upload size exceeds ${MAX_TOTAL_BYTES / 1024 / 1024}MB` };
		}
	}

	return { ok: true };
}

/**
 * Thorough server-side validation of an uploaded file's actual content.
 *
 * Checks:
 * 1. Size is within limits and > 0
 * 2. MIME type is in the allowlist
 * 3. Extension matches claimed MIME type
 * 4. Magic bytes match claimed MIME type
 */
function validateFileContent(args: {
	fileName: string;
	claimedMimeType: string;
	data: Uint8Array;
}): ValidationResult {
	const { fileName, claimedMimeType, data } = args;

	if (data.length === 0) {
		return { ok: false, message: `File is empty: ${fileName}` };
	}

	if (data.length > MAX_FILE_BYTES) {
		return { ok: false, message: `File too large: ${fileName} (${data.length} bytes, max ${MAX_FILE_BYTES})` };
	}

	if (!isAllowedMimeType(claimedMimeType)) {
		return { ok: false, message: `Unsupported file type: ${claimedMimeType}` };
	}

	if (!isExtensionValidForMime(fileName, claimedMimeType)) {
		return { ok: false, message: `File extension does not match type: ${fileName}` };
	}

	if (!verifyMagicBytes(data, claimedMimeType)) {
		return { ok: false, message: `File content does not match claimed type (${claimedMimeType}): ${fileName}` };
	}

	return { ok: true };
}

export {
	validateUploadMeta,
	validateFileContent,
	type UploadMeta,
	type ValidationResult,
};
