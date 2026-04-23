import {
	screeningPipelineCallbackSchema,
	screeningPipelineCompletionSchema,
	screeningPipelineErrorSchema,
	screeningPipelineResultSchema,
	type ScreeningPipelineCallback,
} from "@resumemo/core/schemas"

export const pipelineResultV3Schema = screeningPipelineResultSchema
export const pipelineCompletionV3BodySchema = screeningPipelineCompletionSchema
export const pipelineErrorV3BodySchema = screeningPipelineErrorSchema
export const pipelineV3CallbackBodySchema = screeningPipelineCallbackSchema

export type PipelineV3CallbackBody = ScreeningPipelineCallback
