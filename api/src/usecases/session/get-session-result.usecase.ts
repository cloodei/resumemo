import { sessionRepository } from "~/repositories/session-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

export async function getSessionResultUsecase(input: {
	userId: string
	sessionId: string
	resultId: string
}) {
	const ownedSession = await sessionRepository.getOwnedSessionById(input.userId, input.sessionId)
	if (!ownedSession) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const data = await sessionRepository.getSessionResultById(input.sessionId, input.resultId, ownedSession.activeRunId ?? null)
	if (!data) {
		return usecaseFailure(404, {
			status: "error",
			message: "Result not found",
		})
	}

	return usecaseSuccess({ result: data })
}
