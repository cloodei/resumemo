import { generatePresignedReadUrl } from "~/lib/storage"
import { sessionRepository } from "~/repositories/session-repository"

import { usecaseFailure, usecaseSuccess } from "../result"

export async function getSessionFileAccessUsecase(input: {
	userId: string
	sessionId: string
	fileId: number
	disposition?: "inline" | "attachment"
}) {
	const ownedSession = await sessionRepository.getOwnedSessionById(input.userId, input.sessionId)
	if (!ownedSession) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const files = await sessionRepository.listSessionFiles(input.sessionId)
	const file = files.find(item => item.fileId === input.fileId)
	if (!file) {
		return usecaseFailure(404, {
			status: "error",
			message: "File not found for this session",
		})
	}

	const disposition = input.disposition === "attachment" ? "attachment" : "inline"
	const url = await generatePresignedReadUrl({
		storageKey: file.storageKey,
		fileName: file.originalName,
		mimeType: file.mimeType,
		disposition,
	})

	return usecaseSuccess({
		url,
		disposition,
		fileId: file.fileId,
		originalName: file.originalName,
		mimeType: file.mimeType,
		expiresInSeconds: 900,
	})
}
