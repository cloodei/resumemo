import { sessionRepository } from "~/repositories/session-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

export async function getSessionDetailUsecase(input: {
	userId: string
	sessionId: string
}) {
	const session = await sessionRepository.getOwnedSessionById(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const files = await sessionRepository.listSessionFiles(input.sessionId)
	if (files.length === 0) {
		return usecaseFailure(404, {
			status: "error",
			message: "Files not found",
		})
	}

	const results = session.status === "completed"
		? await sessionRepository.listSessionResults(input.sessionId, "desc", session.activeRunId ?? null)
		: null

	return usecaseSuccess({ session, files, results })
}
