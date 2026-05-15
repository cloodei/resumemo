import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchJobDescriptionTemplates() {
	const { data, error } = await api.api.v2.sessions["job-description-templates"].get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load job description templates")

	return data.templates
}
