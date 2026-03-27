import { randomUUIDv7 } from "bun"

import {
	cleanupUploadedKeys,
	verifyUploads,
} from "~/lib/storage"
import { publishPipelineJob } from "~/lib/queue"
import { sessionRepository } from "~/repositories/session-repository"

import type { CreateSessionBody } from "~/schemas/session"
import { usecaseFailure, usecaseSuccess } from "../result"

const CREATE_SESSION_FAILED_MESSAGE = "We couldn't start processing. Please try again."

export async function createSessionUsecase(input: {
	userId: string
	body: CreateSessionBody
}) {
	const { name, jobDescription, jobTitle, files } = input.body

	if (files.length === 0) {
		return usecaseFailure(400, {
			status: "error",
			message: "At least one file is required",
		})
	}

	for (const file of files) {
		if (!file.storageKey.startsWith(`${input.userId}/`)) {
			return usecaseFailure(403, {
				status: "error",
				message: "Storage key does not belong to this user",
			})
		}
	}

	const failures = await verifyUploads(files)
	if (failures.length > 0) {
		await cleanupUploadedKeys(files.map(file => file.storageKey))

		return usecaseFailure(400, {
			status: "error",
			message: "Upload verification failed",
			failures,
		})
	}

	let sessionId: string | null = null
	const runId = randomUUIDv7()

	try {
		const created = await sessionRepository.createSession({
			userId: input.userId,
			name,
			jobDescription,
			jobTitle: jobTitle ?? null,
			runId,
			files,
		})

		if (!created) {
			return usecaseFailure(500, {
				status: "error",
				message: "We couldn't start processing.",
				details: "Please try again.",
				retryable: true,
				targetSessionId: null,
			})
		}

		sessionId = created.session.id

		try {
			await publishPipelineJob({
				session_id: sessionId,
				run_id: runId,
				job_description: jobDescription,
				files: created.files.map(file => ({
					file_id: file.fileId,
					storage_key: file.storageKey,
					original_name: file.originalName,
				})),
			})
		}
		catch {
			await sessionRepository.updateSessionFailure(sessionId, CREATE_SESSION_FAILED_MESSAGE)

			return usecaseFailure(500, {
				status: "error",
				message: "We couldn't start processing.",
				details: "Please try again.",
				retryable: true,
				targetSessionId: sessionId,
			})
		}

		return usecaseSuccess({
			status: "processing",
			sessionId,
			runId,
			totalConfirmed: files.length,
		})
	}
	catch {
		return usecaseFailure(500, {
			status: "error",
			message: "We couldn't start processing.",
			details: "Please try again.",
			retryable: true,
			targetSessionId: sessionId,
		})
	}
}
