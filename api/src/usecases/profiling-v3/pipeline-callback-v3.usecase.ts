import { applyScreeningPipelineCallback } from "~/modules/screening/service"
import type { PipelineV3CallbackBody } from "~/schemas/pipeline-v3"

export async function pipelineCallbackV3Usecase(input: {
	body: PipelineV3CallbackBody
	secretHeader?: string | null
}) {
	return applyScreeningPipelineCallback(input)
}
