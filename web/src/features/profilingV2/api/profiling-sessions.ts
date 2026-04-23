import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchScreeningSessions() {
	const { data, error } = await api.api.v3.sessions.get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load screening sessions")

	return data.sessions.map(session => ({
		...session,
		totalFiles: Number(session.totalFiles),
	}))
}

export type ScreeningSessionList = Awaited<ReturnType<typeof fetchScreeningSessions>>
