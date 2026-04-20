import { usecaseSuccess } from "../result"
import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

/**
 * Lists all saved job description templates owned by the user.
 *
 * @param input - User id used to scope template ownership.
 * @returns Standardized usecase result containing the user's templates.
 */
export async function listJobDescriptionTemplatesV3Usecase(input: {
	userId: string
}) {
	const templates = await profilingV3Repository.listJobDescriptionsByUserId(input.userId)
	return usecaseSuccess({ templates })
}
