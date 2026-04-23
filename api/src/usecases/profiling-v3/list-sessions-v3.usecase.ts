import { listScreeningSessions } from "~/modules/screening/service"

export async function listSessionsV3Usecase(input: {
	userId: string
}) {
	return listScreeningSessions(input.userId)
}
