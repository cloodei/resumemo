import { usecaseSuccess } from "../result"
import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

/**
 * Lists all v3 profiling sessions owned by the user.
 *
 * @param input - User id used to scope the session query.
 * @returns Standardized usecase result containing the user's sessions.
 */
export async function listSessionsV3Usecase(input: {
	userId: string
}) {
	const sessions = await profilingV3Repository.listSessionsByUserId(input.userId)
	return usecaseSuccess({ sessions })
}
