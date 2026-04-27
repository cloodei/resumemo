import { sessionRepository } from "~/repositories/session-repository"
import { usecaseFailure, usecaseSuccess } from "../result"
import type { CreateJobDescriptionTemplateBody } from "~/schemas/session"

export async function createJobDescriptionTemplateUsecase(input: {
	userId: string
	body: CreateJobDescriptionTemplateBody
}) {
	const jobDescription = input.body.jobDescription.trim()
	if (!jobDescription) {
		return usecaseFailure(400, {
			status: "error",
			message: "Job description is required",
		})
	}

	const template = await sessionRepository.createJobDescriptionTemplate({
		userId: input.userId,
		name: input.body.name.trim(),
		jobTitle: input.body.jobTitle?.trim() || null,
		jobDescription,
	})

	return usecaseSuccess({ status: "ok", template })
}
