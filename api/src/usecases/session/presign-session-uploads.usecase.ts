import {
	generatePresignedUploadUrl,
	generateStorageKey,
} from "~/lib/storage"
import { validateFileMetadata } from "~/lib/upload-guard"

import type { PresignSessionUploadsBody } from "~/schemas/session"
import { usecaseFailure, usecaseSuccess } from "../result"

export async function presignSessionUploadsUsecase(input: {
	userId: string
	body: PresignSessionUploadsBody
}) {
	const { files } = input.body

	const distinctClientIds = new Set(files.map(file => file.clientId))
	if (distinctClientIds.size !== files.length) {
		return usecaseFailure(400, {
			status: "error",
			message: "Each file must have a unique clientId",
			errors: null,
		})
	}

	const metadataErrors = files
		.map((file) => {
			const check = validateFileMetadata({
				fileName: file.fileName,
				claimedMimeType: file.mimeType,
				size: file.size,
			})

			if (check.ok)
				return null

			return {
				clientId: file.clientId,
				reason: check.message,
			}
		})
		.filter(issue => issue !== null)

	if (metadataErrors.length > 0) {
		return usecaseFailure(400, {
			status: "error",
			message: "Metadata validation failed",
			errors: metadataErrors,
		})
	}

	const uploads = await Promise.all(
		files.map(async (file) => {
			const storageKey = generateStorageKey(input.userId, file.fileName)

			return {
				clientId: file.clientId,
				storageKey,
				uploadUrl: await generatePresignedUploadUrl(storageKey, file.mimeType, file.size),
			}
		}),
	)

	return usecaseSuccess({ status: "ok", uploads })
}
