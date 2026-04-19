import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchProfilingSessionDetail(sessionId: string) {
	const { data, error } = await api.api.v2.sessions({ id: sessionId }).get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load profiling session")

	const files = (data.files ?? []).map(file => ({
		...file,
		fileId: Number(file.fileId),
		size: Number(file.size),
	}))

	const results = data.results?.map(result => ({
		...result,
		fileId: Number(result.fileId),
		overallScore: Number(result.overallScore),
	})) ?? null

	return {
		session: data.session,
		files,
		results,
	}
}
