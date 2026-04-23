import { listScreeningResults } from "~/modules/screening/service"
import type { SessionResultsV3Query } from "~/schemas/session-v3"

export async function listSessionResultsV3Usecase(input: {
	userId: string
	sessionId: string
	sort: SessionResultsV3Query["sort"]
}) {
	return listScreeningResults(input)
}
