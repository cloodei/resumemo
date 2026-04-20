import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

/**
 * Retrieves session detail for a user-owned session, including uploaded files
 * and (when completed) result rows for the active run.
 *
 * Returns 404 when the session is not found or not owned by the user.
 *
 * @param input - User id and target session id.
 * @returns Standardized usecase result with session data, files, and optional results.
 */
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
