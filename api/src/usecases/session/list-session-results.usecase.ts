import { sessionRepository } from "~/repositories/session-repository"

import type { SessionSort } from "~/types"

import { usecaseFailure, usecaseSuccess } from "../result"

export async function listSessionResultsUsecase(input: {
	userId: string
	sessionId: string
	sort: SessionSort
}) {
	const session = await sessionRepository.getOwnedSessionById(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const results = await sessionRepository.listSessionResults(input.sessionId, input.sort, session.activeRunId ?? null)
	if (results === null) {
		return usecaseFailure(404, {
			status: "error",
			message: "Results not found",
		})
	}

	return usecaseSuccess({
		sessionId: input.sessionId,
		sessionStatus: session.status,
		totalResults: results.length,
		results,
	})
}
