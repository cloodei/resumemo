import { getScreeningJobDescription } from "~/modules/screening/service"

export async function getJobDescriptionTemplateV3Usecase(input: {
	userId: string
	jobDescriptionId: string
}) {
	return getScreeningJobDescription(input.userId, input.jobDescriptionId)
}
