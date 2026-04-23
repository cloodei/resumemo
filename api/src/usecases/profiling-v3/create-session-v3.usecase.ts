import { createScreeningSession } from "~/modules/screening/service"
import type { CreateSessionV3Body } from "~/schemas/session-v3"
export async function createSessionV3Usecase(input: {
	userId: string
	body: CreateSessionV3Body
}) {
	return createScreeningSession(input)
}
