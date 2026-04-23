import { getScreeningSessionDetail } from "~/modules/screening/service"

export async function getSessionDetailV3Usecase(input: {
	userId: string
	sessionId: string
}) {
	return getScreeningSessionDetail(input.userId, input.sessionId)
}
