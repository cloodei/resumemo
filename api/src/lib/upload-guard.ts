import {
	ALLOWED_MIME_TYPES_SET,
	MIME_EXTENSION_MAP,
	ALLOWED_MIME_TYPES,
	MAGIC_BYTES,
	MAX_FILE_BYTES,
} from "@shared/constants/file-uploads";

function getExtension(fileName: string) {
	const trimmed = fileName.trim().toLowerCase();
	const dotIndex = trimmed.lastIndexOf(".");
	if (dotIndex === -1)
		return "";

	return trimmed.slice(dotIndex);
}

function isAllowedMimeType(mimeType: string): mimeType is ALLOWED_MIME_TYPES {
	return ALLOWED_MIME_TYPES_SET.has(mimeType as ALLOWED_MIME_TYPES);
}

/**
 * Cheap metadata-only validation. No file bytes are read.
 *
 * Checks:
 * 1. MIME type is in the allowlist
 * 2. File extension matches the claimed MIME type
 * 3. Reported size is > 0 and within MAX_FILE_BYTES
 */
export function validateFileMetadata(args: {
	fileName: string;
	claimedMimeType: string;
	size: number;
}) {
	const { fileName, claimedMimeType, size } = args;

	if (!isAllowedMimeType(claimedMimeType))
		return { ok: false as const, message: `Unsupported file type: ${claimedMimeType}` };
	if (!isExtensionValidForMime(fileName, claimedMimeType))
		return { ok: false as const, message: `File extension does not match type: ${fileName}` };
	if (size <= 0)
		return { ok: false as const, message: `File is empty: ${fileName}` };
	if (size > MAX_FILE_BYTES)
		return { ok: false as const, message: `File too large: ${fileName} (${size} bytes, max ${MAX_FILE_BYTES})` };

	return { ok: true as const };
}

function isExtensionValidForMime(fileName: string, mimeType: ALLOWED_MIME_TYPES) {
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
function verifyMagicBytes(data: Uint8Array, mimeType: ALLOWED_MIME_TYPES) {
	if (mimeType === "text/plain")
		return isPlausibleText(data);

	const sig = MAGIC_BYTES[mimeType];
	if (!sig)
		return true;

	if (data.length < sig.offset + sig.bytes.length)
		return false;

	for (let i = 0; i < sig.bytes.length; i++)
		if (data[sig.offset + i] !== sig.bytes[i])
			return false;

	return true;
}

/**
 * Heuristic for text/plain: scan the first 8 KB for null bytes.
 * Presence of `0x00` almost always indicates a binary file.
 */
function isPlausibleText(data: Uint8Array) {
	const scanLength = Math.min(data.length, 8192);
	for (let i = 0; i < scanLength; i++)
		if (data[i] === 0x00)
			return false;

	return true;
}

/**
 * Server-side content validation using file bytes.
 *
 * Checks:
 * 1. Magic bytes match claimed MIME type for known binary formats
 * 2. text/plain looks like text (no null bytes in first 8 KB)
 */
export function validateFileContent(args: {
	fileName: string;
	claimedMimeType: ALLOWED_MIME_TYPES;
	data: Uint8Array;
}) {
	const { fileName, claimedMimeType, data } = args;
	if (!verifyMagicBytes(data, claimedMimeType))
		return { ok: false as const, message: `File content does not match claimed type (${claimedMimeType}): ${fileName}` };

	return { ok: true } as const;
}
