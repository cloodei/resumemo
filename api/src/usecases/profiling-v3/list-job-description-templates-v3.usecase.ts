import { listScreeningJobDescriptions } from "~/modules/screening/service"

export async function listJobDescriptionTemplatesV3Usecase(input: {
	userId: string
}) {
	return listScreeningJobDescriptions(input.userId)
}
