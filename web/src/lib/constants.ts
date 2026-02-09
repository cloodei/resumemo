export {
	MAX_FILE_BYTES,
	MAX_FILES_PER_SESSION,
	ALLOWED_MIME_TYPES,
	ALLOWED_MIME_TYPES_LIST,
	FILE_INPUT_ACCEPT,
	SSE_EVENTS,
} from "@shared/constants/file-uploads"

const BASE_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? "http://localhost:8080"

export { BASE_URL }
