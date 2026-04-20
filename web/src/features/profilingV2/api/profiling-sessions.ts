import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchProfilingV3Sessions() {
	const { data, error } = await api.api.v3.sessions.get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load v3 profiling sessions")

	return data.sessions.map(session => ({
		...session,
		totalFiles: Number(session.totalFiles),
	}))
}

export type ProfilingV3SessionList = Awaited<ReturnType<typeof fetchProfilingV3Sessions>>
