import { profilingV3Repository } from "~/repositories/profiling-v3-repository"
import type { PipelineV3CallbackBody } from "~/schemas/pipeline-v3"
import { apiEnv } from "~/config/env"
import { usecaseFailure, usecaseSuccess } from "../result"

const PIPELINE_CALLBACK_SECRET = apiEnv.pipeline.callbackSecret

/**
 * Validates the shared secret header sent by the pipeline worker callback.
 *
 * @param secretHeader - Secret value provided by the callback request.
 * @returns True only when both values exist and match exactly.
 */
function hasValidSecret(secretHeader?: string | null) {
	if (!PIPELINE_CALLBACK_SECRET || !secretHeader)
		return false

	return secretHeader === PIPELINE_CALLBACK_SECRET
}

/**
 * Handles async v3 pipeline callbacks for completion or failure events.
 *
 * Behavior summary:
 * - Rejects requests with invalid callback secret.
 * - Ignores callbacks when the target session is missing.
 * - Ignores stale callbacks whose run id is no longer active.
 * - On completion, replaces run results and marks the session completed.
 * - On failure, stores partial results (if present) and marks the session failed.
 *
 * Returns a generic ok response for accepted callbacks, including skipped stale
 * callbacks to keep worker retries idempotent.
 *
 * @param input - Callback body plus secret header from the request.
 * @returns Standardized usecase result with unauthorized, not found, skipped, or ok status.
 */
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
