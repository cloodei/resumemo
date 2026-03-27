import { sessionRepository } from "~/repositories/session-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

export async function listSessionsUsecase(input: { userId: string }) {
	const data = await sessionRepository.listSessionsByUserId(input.userId)
	if (!data) {
		return usecaseFailure(500, {
			status: "error",
			message: "We couldn't load sessions right now",
		})
	}

	return usecaseSuccess({ sessions: data })
}
