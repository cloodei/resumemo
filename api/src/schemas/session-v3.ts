import { t } from "elysia"

import { MAX_FILES_PER_SESSION } from "@resumemo/core/constants/file-uploads"

const sessionFileSchema = t.Object({
	storageKey: t.String({ minLength: 1 }),
	fileName: t.String({ minLength: 1, maxLength: 512 }),
	mimeType: t.String({ minLength: 1, maxLength: 128 }),
	size: t.Number({ minimum: 1 }),
})

export const presignSessionUploadsV3BodySchema = t.Object({
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

export const createSessionV3BodySchema = t.Object({
	name: t.String({ minLength: 1, maxLength: 255 }),
	jobDescriptionTemplateId: t.Optional(t.String({ minLength: 1 })),
	jobDescriptionName: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
	jobDescriptionText: t.Optional(t.String({ minLength: 1, maxLength: 5000 })),
	jobTitle: t.Optional(t.String({ maxLength: 255 })),
	files: t.Array(sessionFileSchema, {
		minItems: 1,
		maxItems: MAX_FILES_PER_SESSION,
	}),
})

export const sessionResultsV3QuerySchema = t.Object({
	sort: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
})

export const jobDescriptionTemplateV3ParamsSchema = t.Object({
	id: t.String({ minLength: 1 }),
})

export type PresignSessionUploadsV3Body = typeof presignSessionUploadsV3BodySchema.static
export type CreateSessionV3Body = typeof createSessionV3BodySchema.static
export type SessionResultsV3Query = typeof sessionResultsV3QuerySchema.static
export type JobDescriptionTemplateV3Params = typeof jobDescriptionTemplateV3ParamsSchema.static
