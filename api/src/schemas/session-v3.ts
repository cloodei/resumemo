import { t } from "elysia"

import {
	screeningCreateSessionBodySchema,
	screeningPresignBodySchema,
	screeningResultsQuerySchema,
} from "~/modules/screening/contracts"

export const presignSessionUploadsV3BodySchema = screeningPresignBodySchema
export const createSessionV3BodySchema = screeningCreateSessionBodySchema
export const sessionResultsV3QuerySchema = screeningResultsQuerySchema
export const jobDescriptionTemplateV3ParamsSchema = t.Object({
	id: t.String({ minLength: 1 }),
})

export type PresignSessionUploadsV3Body = typeof presignSessionUploadsV3BodySchema.static
export type CreateSessionV3Body = typeof createSessionV3BodySchema.static
export type SessionResultsV3Query = typeof sessionResultsV3QuerySchema.static
export type JobDescriptionTemplateV3Params = typeof jobDescriptionTemplateV3ParamsSchema.static
