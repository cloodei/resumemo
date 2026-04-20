import { profilingV3Repository } from "~/repositories/profiling-v3-repository"
import type { SessionResultsV3Query } from "~/schemas/session-v3"
import { usecaseFailure, usecaseSuccess } from "../result"

/**
 * Lists candidate results for a session owned by the user.
 *
 * Uses the requested sort direction and scopes results to the session's active
 * run id so stale run records are not mixed into the response.
 * Returns 404 when the session is not found or not owned by the user.
 *
 * @param input - User id, target session id, and result sort preference.
 * @returns Standardized usecase result with sorted results or a not found error.
 */
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
