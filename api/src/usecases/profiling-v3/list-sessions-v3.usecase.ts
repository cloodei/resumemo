import { profilingV3Repository } from "~/repositories/profiling-v3-repository"

import { usecaseSuccess } from "../result"

export async function listSessionsV3Usecase(input: {
	userId: string
}) {
	const sessions = await profilingV3Repository.listSessionsByUserId(input.userId)
	return usecaseSuccess({ sessions })
}
