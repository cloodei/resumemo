/** Maximum size of a single file in bytes (2 MB). */
export const MAX_FILE_BYTES = 2 * 1024 * 1024

/** Maximum number of files per upload batch / profiling session. */
export const MAX_FILES_PER_SESSION = 50

/** Maximum total bytes across all files in a single upload batch (100 MB = MAX_FILES_PER_SESSION * MAX_FILE_BYTES). */
export const MAX_TOTAL_BYTES = MAX_FILES_PER_SESSION * MAX_FILE_BYTES

/**
 * MIME type → allowed file extensions mapping.
 *
 * Only these combinations are accepted for upload.
 */
export const MIME_EXTENSION_MAP = {
	"application/pdf": [".pdf"],
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
	"text/plain": [".txt"],
} as const

/** Set of allowed MIME types, derived from the extension map. */
export const ALLOWED_MIME_TYPES = new Set(
	Object.keys(MIME_EXTENSION_MAP) as (keyof typeof MIME_EXTENSION_MAP)[],
)

/** Flat array of allowed MIME type strings (useful for `<input accept>` and array `.includes()`). */
export const ALLOWED_MIME_TYPES_LIST = Object.keys(MIME_EXTENSION_MAP) as (keyof typeof MIME_EXTENSION_MAP)[]

/** Flat array of allowed file extensions (useful for `<input accept>`). */
export const ALLOWED_EXTENSIONS_LIST = Object.values(MIME_EXTENSION_MAP).flat()

/** Accept string for `<input type="file">` — combines extensions. */
export const FILE_INPUT_ACCEPT = ALLOWED_EXTENSIONS_LIST.join(",")

/**
 * Magic byte signatures used for server-side content validation.
 *
 * Each entry maps a MIME type to its expected file header bytes.
 * The server reads the first N bytes and compares against these
 * to verify the file content matches its claimed MIME type.
 */
export const MAGIC_BYTES = {
	/** PDF files start with `%PDF-` */
	"application/pdf": {
		bytes: [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
		offset: 0,
	},
	/** DOCX files are ZIP archives starting with PK\x03\x04 */
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
		bytes: [0x50, 0x4B, 0x03, 0x04], // PK..
		offset: 0,
	},
	// text/plain has no magic bytes — validated by checking for valid UTF-8
	// and absence of null bytes instead
} as const satisfies Partial<Record<keyof typeof MIME_EXTENSION_MAP, { bytes: readonly number[]; offset: number }>>

/** SSE event types emitted during the upload stream. */
export const SSE_EVENTS = {
	FILE_VALIDATING: "file:validating",
	FILE_VALIDATED: "file:validated",
	FILE_UPLOADING: "file:uploading",
	FILE_DONE: "file:done",
	FILE_FAILED: "file:failed",
	FILE_REUSED: "file:reused",
	UPLOAD_COMPLETE: "upload:complete",
} as const
