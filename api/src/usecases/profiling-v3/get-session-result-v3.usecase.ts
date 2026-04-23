import { getScreeningResult } from "~/modules/screening/service"

export async function getSessionResultV3Usecase(input: {
	userId: string
	sessionId: string
	resultId: string
}) {
	return getScreeningResult(input)
}
