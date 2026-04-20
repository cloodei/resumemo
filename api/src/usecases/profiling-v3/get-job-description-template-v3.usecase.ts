import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

/**
 * Retrieves a single job description template that belongs to the user.
 *
 * Returns 404 when the template id does not exist or is not owned by the user.
 *
 * @param input - User id and target job description template id.
 * @returns Standardized usecase result with the template or a not found error.
 */
export async function getJobDescriptionTemplateV3Usecase(input: {
	userId: string
	jobDescriptionId: string
}) {
	const template = await profilingV3Repository.getOwnedJobDescriptionById(input.userId, input.jobDescriptionId)
	if (!template) {
		return usecaseFailure(404, {
			status: "error",
			message: "Job description template not found",
		})
	}

	return usecaseSuccess({ template })
}
