import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

import type { SessionResultsV3Query } from "~/schemas/session-v3"
import { usecaseFailure, usecaseSuccess } from "../result"

export async function listSessionResultsV3Usecase(input: {
	userId: string
	sessionId: string
	sort: SessionResultsV3Query["sort"]
}) {
	const session = await profilingV3Repository.getOwnedSessionById(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const results = await profilingV3Repository.listSessionResults(
		input.sessionId,
		input.sort === "asc" ? "asc" : "desc",
		session.activeRunId ?? null,
	)

	return usecaseSuccess({ results })
}
