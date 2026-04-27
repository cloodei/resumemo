import { sessionRepository } from "~/repositories/session-repository"
import { usecaseFailure, usecaseSuccess } from "../result"

export async function listJobDescriptionTemplatesUsecase(input: { userId: string }) {
	const templates = await sessionRepository.listJobDescriptionTemplates(input.userId)
	if (!templates) {
		return usecaseFailure(500, {
			status: "error",
			message: "We couldn't load job description templates right now",
		})
	}

	return usecaseSuccess({ templates })
}
