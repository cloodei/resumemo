import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

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
