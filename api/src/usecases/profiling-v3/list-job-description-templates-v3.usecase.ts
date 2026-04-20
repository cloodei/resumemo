import { usecaseSuccess } from "../result"
import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

export async function listJobDescriptionTemplatesV3Usecase(input: {
	userId: string
}) {
	const templates = await profilingV3Repository.listJobDescriptionsByUserId(input.userId)
	return usecaseSuccess({ templates })
}
