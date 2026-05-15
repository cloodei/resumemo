import { api } from "@/lib/api"
import { getEdenErrorMessage } from "@/lib/errors"

export async function fetchCandidateResultDetail(args: { sessionId: string; resultId: string }) {
	const { data, error } = await api.api.v2.sessions({ id: args.sessionId }).results({ resultId: args.resultId }).get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load candidate details")

	return {
		...data.result,
		fileId: Number(data.result.fileId),
		overallScore: Number(data.result.overallScore),
	}
}
