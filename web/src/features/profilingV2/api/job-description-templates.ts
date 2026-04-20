import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchJobDescriptionTemplatesV3() {
	const { data, error } = await api.api.v3["job-descriptions"].templates.get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load v3 job description templates")

	return data.templates
}

export async function fetchJobDescriptionTemplateV3(id: string) {
	const { data, error } = await api.api.v3["job-descriptions"].templates({ id }).get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load v3 job description template")

	return data.template
}

export type ProfilingV3JobDescriptionTemplates = Awaited<ReturnType<typeof fetchJobDescriptionTemplatesV3>>
export type ProfilingV3JobDescriptionTemplate = Awaited<ReturnType<typeof fetchJobDescriptionTemplateV3>>
