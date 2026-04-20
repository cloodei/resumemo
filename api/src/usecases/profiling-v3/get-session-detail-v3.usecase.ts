import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

export async function getSessionDetailV3Usecase(input: {
	userId: string
	sessionId: string
}) {
	const session = await profilingV3Repository.getOwnedSessionById(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const files = await profilingV3Repository.listSessionFiles(input.sessionId)
	const results = session.status === "completed"
		? await profilingV3Repository.listSessionResults(input.sessionId, "desc", session.activeRunId ?? null)
		: null

	return usecaseSuccess({ session, files, results })
}
