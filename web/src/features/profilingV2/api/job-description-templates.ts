import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchScreeningJobDescriptionTemplates() {
	const { data, error } = await api.api.v3["job-descriptions"].templates.get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load job description templates")

	return data.templates
}

export async function fetchScreeningJobDescriptionTemplate(id: string) {
	const { data, error } = await api.api.v3["job-descriptions"].templates({ id }).get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load job description template")

	return data.template
}

export type ScreeningJobDescriptionTemplates = Awaited<ReturnType<typeof fetchScreeningJobDescriptionTemplates>>
export type ScreeningJobDescriptionTemplate = Awaited<ReturnType<typeof fetchScreeningJobDescriptionTemplate>>
