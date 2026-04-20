import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

export async function getSessionResultV3Usecase(input: {
	userId: string
	sessionId: string
	resultId: string
}) {
	const session = await profilingV3Repository.getOwnedSessionById(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const result = await profilingV3Repository.getSessionResultById(
		input.sessionId,
		input.resultId,
		session.activeRunId ?? null,
	)

	if (!result) {
		return usecaseFailure(404, {
			status: "error",
			message: "Result not found",
		})
	}

	return usecaseSuccess({ result })
}
