import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchProfilingV3SessionDetail(id: string) {
	const { data, error } = await api.api.v3.sessions({ id }).get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load v3 profiling session")

	return {
		session: {
			...data.session,
			totalFiles: Number(data.session.totalFiles),
		},
		files: data.files.map(file => ({
			...file,
			fileId: Number(file.fileId),
			size: Number(file.size),
		})),
		results: data.results?.map(result => ({
			...result,
			fileId: Number(result.fileId),
			overallScore: Number(result.overallScore),
			baseScore: Number(result.baseScore),
			bonusScore: Number(result.bonusScore),
		})) ?? null,
	}
}

export type ProfilingV3SessionDetail = Awaited<ReturnType<typeof fetchProfilingV3SessionDetail>>
