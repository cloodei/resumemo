import { profilingV3Repository } from "~/repositories/profiling-v3-repository"
import { usecaseFailure, usecaseSuccess } from "../result"

/**
 * Retrieves one candidate result from a session owned by the user.
 *
 * Access is checked at the session level first. Result lookup is then scoped to
 * the session's active run id so only current-run data is returned.
 * Returns 404 when the session or result cannot be found.
 *
 * @param input - User id, session id, and result id to retrieve.
 * @returns Standardized usecase result with the result payload or a not found error.
 */
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
