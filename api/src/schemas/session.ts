import { t } from "elysia"

import { MAX_FILES_PER_SESSION } from "@resumemo/core/constants/file-uploads"

export const presignSessionUploadsBodySchema = t.Object({
	files: t.Array(
		t.Object({
			clientId: t.Number(),
			fileName: t.String({ minLength: 1, maxLength: 512 }),
			mimeType: t.String({ minLength: 1, maxLength: 128 }),
			size: t.Number({ minimum: 1 }),
		}),
		{ minItems: 1, maxItems: MAX_FILES_PER_SESSION },
	),
})

export const createSessionBodySchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
	jobDescription: t.String({ minLength: 1, maxLength: 5000 }),
	jobTitle: t.Optional(t.String({ maxLength: 255 })),
	files: t.Array(
		t.Object({
			storageKey: t.String({ minLength: 1 }),
			fileName: t.String({ minLength: 1, maxLength: 512 }),
			mimeType: t.String({ minLength: 1, maxLength: 128 }),
			size: t.Number({ minimum: 1 }),
		}),
		{ minItems: 1, maxItems: MAX_FILES_PER_SESSION },
	),
})

export const retrySessionBodySchema = t.Object({
	mode: t.Union([
		t.Literal("rerun_current"),
		t.Literal("clone_current"),
		t.Literal("clone_with_updates"),
		t.Literal("replace_with_updates"),
	]),
	name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	jobTitle: t.Optional(t.String({ maxLength: 255 })),
	jobDescription: t.Optional(t.String({ minLength: 1, maxLength: 5000 })),
})

export const sessionResultsQuerySchema = t.Object({
	sort: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
})

export const sessionExportQuerySchema = t.Object({
	format: t.Optional(t.Union([t.Literal("json"), t.Literal("csv")])),
})

export type PresignSessionUploadsBody = typeof presignSessionUploadsBodySchema.static
export type CreateSessionBody = typeof createSessionBodySchema.static
export type RetrySessionBody = typeof retrySessionBodySchema.static
export type SessionResultsQuery = typeof sessionResultsQuerySchema.static
export type SessionExportQuery = typeof sessionExportQuerySchema.static
