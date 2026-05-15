import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchProfilingSessions() {
	const { data, error } = await api.api.v2.sessions.get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load sessions")

	return data.sessions
}
