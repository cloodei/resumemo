import { sessionRepository } from "~/repositories/session-repository"
import type { PipelineCallbackBody } from "~/schemas/pipeline"
import { usecaseFailure, usecaseSuccess } from "../result"

const PIPELINE_CALLBACK_SECRET = process.env.PIPELINE_CALLBACK_SECRET ?? ""

function getPipelineSecretHeaderName() {
	return (process.env.PIPELINE_SECRET_HEADER_NAME ?? "x-pipeline-secret").toLowerCase()
}

function hasValidSecret(secretHeader?: string | null) {
	if (!PIPELINE_CALLBACK_SECRET || !secretHeader)
		return false

	return secretHeader === PIPELINE_CALLBACK_SECRET
}

export function getPipelineSecretHeader() {
	return getPipelineSecretHeaderName()
}

export async function pipelineCallbackUsecase(input: {
	body: PipelineCallbackBody
	secretHeader?: string | null
}) {
	if (!hasValidSecret(input.secretHeader)) {
		return usecaseFailure(401, {
			status: "error",
			message: "Unauthorized",
		})
	}

	const session = await sessionRepository.getSessionById(input.body.session_id)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	if (!session.activeRunId || session.activeRunId !== input.body.run_id)
		return usecaseSuccess({ status: "ok", skipped: true })

	const handled = input.body.type === "completion"
		? await sessionRepository.replaceRunResultsAndSetCompleted({
			sessionId: input.body.session_id,
			runId: input.body.run_id,
			results: input.body.results,
		})
		: await sessionRepository.replaceRunResultsAndSetFailed({
			sessionId: input.body.session_id,
			runId: input.body.run_id,
			error: input.body.error,
			partialResults: input.body.partial_results,
		})

	if (!handled)
		return usecaseSuccess({ status: "ok", skipped: true })

	return usecaseSuccess({ status: "ok" })
}
