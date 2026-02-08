const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_FILES_PER_SESSION = 50;


const MIME_EXTENSION_ALLOWLIST = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
	"application/msword": [".doc"],
	"text/plain": [".txt"],
}

const ALLOWED_MIME_TYPES = new Set(Object.keys(MIME_EXTENSION_ALLOWLIST));

type UploadMeta = {
	name: string;
	size: number;
	mimeType: string;
	fingerprint: string;
};

function getExtension(fileName: string): string {
	const trimmed = fileName.trim().toLowerCase();
	const dotIndex = trimmed.lastIndexOf(".");
	if (dotIndex === -1) return "";
	return trimmed.slice(dotIndex);
}

function isAllowedMimeType(mimeType: string): boolean {
	return ALLOWED_MIME_TYPES.has(mimeType);
}

function isAllowedExtensionForMime(fileName: string, mimeType: string): boolean {
	if (
		mimeType !== "application/pdf" &&
		mimeType !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document" &&
		mimeType !== "application/msword" &&
		mimeType !== "text/plain"
	)
		return false;

	const allowed = MIME_EXTENSION_ALLOWLIST[mimeType];
	if (!allowed)
		return false;

	return allowed.includes(getExtension(fileName));
}

function validateUploadRequest(files: UploadMeta[]): { ok: true } | { ok: false; message: string } {
	if (files.length === 0) {
		return { ok: false, message: "At least one file is required" };
	}

	if (files.length > MAX_FILES_PER_SESSION) {
		return { ok: false, message: `Too many files. Max is ${MAX_FILES_PER_SESSION}` };
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
			return { ok: false, message: `File too large: ${file.name}` };
		}

		if (!isAllowedMimeType(file.mimeType)) {
			return { ok: false, message: `Unsupported file type: ${file.mimeType}` };
		}

		if (!isAllowedExtensionForMime(file.name, file.mimeType)) {
			return { ok: false, message: `File extension does not match type: ${file.name}` };
		}

		if (!file.fingerprint || file.fingerprint.length < 8 || file.fingerprint.length > 128) {
			return { ok: false, message: "Invalid fingerprint" };
		}

		totalBytes += file.size;
		if (totalBytes > MAX_TOTAL_BYTES) {
			return { ok: false, message: `Total upload size exceeds ${MAX_TOTAL_BYTES} bytes` };
		}
	}

	return { ok: true };
}

function validateStoredObject(args: {
	fileName: string;
	expectedMimeType: string;
	contentType: string | undefined;
	contentLength: number | undefined;
}): { ok: true } | { ok: false; message: string } {
	const { fileName, expectedMimeType, contentType, contentLength } = args;

	if (!contentLength || contentLength <= 0) {
		return { ok: false, message: `Missing or invalid size for ${fileName}` };
	}

	if (contentLength > MAX_FILE_BYTES) {
		return { ok: false, message: `File too large after upload: ${fileName}` };
	}

	const effectiveMimeType = contentType ?? expectedMimeType;
	if (!isAllowedMimeType(effectiveMimeType)) {
		return { ok: false, message: `Unsupported file type after upload: ${effectiveMimeType}` };
	}

	if (!isAllowedExtensionForMime(fileName, effectiveMimeType)) {
		return { ok: false, message: `File extension mismatch after upload: ${fileName}` };
	}

	return { ok: true };
}

export {
	MAX_FILE_BYTES,
	MAX_FILES_PER_SESSION,
	ALLOWED_MIME_TYPES,
	validateUploadRequest,
	validateStoredObject,
};
