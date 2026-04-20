import { profilingV3Repository } from "~/repositories/profiling-v3-repository"
import type { PipelineV3CallbackBody } from "~/schemas/pipeline-v3"
import { apiEnv } from "~/config/env"
import { usecaseFailure, usecaseSuccess } from "../result"

const PIPELINE_CALLBACK_SECRET = apiEnv.pipeline.callbackSecret

export function getPipelineV3SecretHeader() {
	return apiEnv.pipeline.secretHeaderName
}

function hasValidSecret(secretHeader?: string | null) {
	if (!PIPELINE_CALLBACK_SECRET || !secretHeader)
		return false

	return secretHeader === PIPELINE_CALLBACK_SECRET
}

export async function pipelineCallbackV3Usecase(input: {
	body: PipelineV3CallbackBody
	secretHeader?: string | null
}) {
	if (!hasValidSecret(input.secretHeader)) {
		return usecaseFailure(401, {
			status: "error",
			message: "Unauthorized",
		} as const)
	}

	const session = await profilingV3Repository.getSessionById(input.body.session_id)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		} as const)
	}

	if (!session.activeRunId || session.activeRunId !== input.body.run_id)
		return usecaseSuccess({ status: "ok", skipped: true })

	const handled = input.body.type === "completion"
		? await profilingV3Repository.replaceRunResultsAndSetCompleted({
			sessionId: input.body.session_id,
			runId: input.body.run_id,
			jobDescriptionArtifact: input.body.job_description_artifact,
			results: input.body.results,
		})
		: await profilingV3Repository.replaceRunResultsAndSetFailed({
			sessionId: input.body.session_id,
			runId: input.body.run_id,
			error: input.body.error,
			jobDescriptionArtifact: input.body.job_description_artifact ?? null,
			partialResults: input.body.partial_results,
		})

	if (!handled)
		return usecaseSuccess({ status: "ok", skipped: true })

	return usecaseSuccess({ status: "ok" })
}
