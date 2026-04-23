import { t } from "elysia"
import { MAX_FILES_PER_SESSION } from "@resumemo/core/constants/file-uploads"

const uploadFileSchema = t.Object({
	storageKey: t.String({ minLength: 1 }),
	fileName: t.String({ minLength: 1, maxLength: 512 }),
	mimeType: t.String({ minLength: 1, maxLength: 128 }),
	size: t.Number({ minimum: 1 }),
})

export const screeningPresignBodySchema = t.Object({
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

export const screeningCreateSessionBodySchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
	jobDescriptionTemplateId: t.Optional(t.String({ minLength: 1 })),
	jobDescriptionName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	jobDescriptionText: t.Optional(t.String({ minLength: 1, maxLength: 10000 })),
	jobTitle: t.Optional(t.String({ maxLength: 255 })),
	files: t.Array(uploadFileSchema, {
		minItems: 1,
		maxItems: MAX_FILES_PER_SESSION,
	}),
})

export const screeningResultsQuerySchema = t.Object({
	sort: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
})

export type ScreeningPresignBody = typeof screeningPresignBodySchema.static
export type ScreeningCreateSessionBody = typeof screeningCreateSessionBodySchema.static
export type ScreeningResultsQuery = typeof screeningResultsQuerySchema.static
