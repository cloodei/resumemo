const BASE_URL = import.meta.env.VITE_AUTH_SERVER_URL ?? "http://localhost:8080"

/**
 * 2MB
*/
const MAX_FILE_SIZE = 2 * 1024 * 1024
const MAX_BATCH_SIZE = 50 as const
const ALLOWED_MIME_TYPES_CONST = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const
const ALLOWED_MIME_TYPES_STRING = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]


export {
  BASE_URL,
  ALLOWED_MIME_TYPES_CONST,
  ALLOWED_MIME_TYPES_STRING,
  MAX_FILE_SIZE,
  MAX_BATCH_SIZE,
}
