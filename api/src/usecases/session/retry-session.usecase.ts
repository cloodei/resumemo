import { randomUUIDv7 } from "bun"

import { verifyUploads } from "~/lib/storage"
import { sessionRepository } from "~/repositories/session-repository"
import { publishPipelineJob } from "~/lib/queue"
import type { RetrySessionBody } from "~/schemas/session"
import { usecaseFailure, usecaseSuccess } from "../result"

const RETRY_SESSION_FAILED_MESSAGE = "We couldn't restart processing. Please try again."
const RETRY_CLONE_FAILED_MESSAGE = "We couldn't start the new copied session. Please try again."

type RetrySessionSuccess = {
	status: "retrying" | "processing"
	sessionId: string
	runId: string
	totalConfirmed: number
	action: RetrySessionBody["mode"]
	targetSessionId: string
}

type RetrySessionError = {
	status: "error"
	message: string
	details?: string
	retryable?: boolean
	targetSessionId?: string | null
	failures?: unknown
}

export async function retrySessionUsecase(input: {
	userId: string
	sessionId: string
	body: RetrySessionBody
}) {
	const existingSession = await sessionRepository.getOwnedSessionById(input.userId, input.sessionId)
	if (!existingSession) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	if (existingSession.status === "processing" || existingSession.status === "retrying") {
		return usecaseFailure(409, {
			status: "error",
			message: "This session is already running",
		})
	}

	const currentFiles = await sessionRepository.listSessionFiles(existingSession.id)
	if (currentFiles.length === 0) {
		return usecaseFailure(404, {
			status: "error",
			message: "Files not found for this session",
		})
	}

	const reusableFailures = await verifyUploads(currentFiles.map(file => ({
		storageKey: file.storageKey,
		fileName: file.originalName,
		mimeType: file.mimeType,
		size: Number(file.size),
	})))
	if (reusableFailures.length > 0) {
		return usecaseFailure(409, {
			status: "error",
			message: "Some existing uploads are no longer available for retry",
			failures: reusableFailures,
		})
	}

	const nextName = input.body.name?.trim() || existingSession.name
	const nextJobTitle = input.body.jobTitle !== undefined
		? input.body.jobTitle.trim() || null
		: existingSession.jobTitle
	const nextJobDescription = input.body.jobDescription?.trim() || existingSession.jobDescription

	const runId = randomUUIDv7()
	try {
		switch (input.body.mode) {
			case "rerun_current": {
				const mutation = await sessionRepository.persistRetrySession({
					mode: input.body.mode,
					userId: input.userId,
					sessionId: existingSession.id,
					runId,
					name: existingSession.name,
					jobTitle: existingSession.jobTitle,
					jobDescription: existingSession.jobDescription,
					files: currentFiles,
				})

				if (!mutation) {
					return usecaseFailure(500, {
						status: "error",
						message: "We couldn't restart processing.",
						details: "Please try again.",
						retryable: true,
						targetSessionId: existingSession.id,
					})
				}

				try {
					await publishPipelineJob({
						session_id: existingSession.id,
						run_id: runId,
						job_description: existingSession.jobDescription,
						files: currentFiles.map(file => ({
							file_id: file.fileId,
							storage_key: file.storageKey,
							original_name: file.originalName,
						})),
					})
				}
				catch {
					await sessionRepository.updateSessionFailure(existingSession.id, RETRY_SESSION_FAILED_MESSAGE)

					return usecaseFailure(500, {
						status: "error",
						message: "We couldn't restart processing.",
						details: "Please try again.",
						retryable: true,
						targetSessionId: existingSession.id,
					})
				}

				return usecaseSuccess({
					status: mutation.status,
					sessionId: existingSession.id,
					runId,
					totalConfirmed: currentFiles.length,
					action: input.body.mode,
					targetSessionId: existingSession.id,
				})
			}

			case "clone_current":
			case "clone_with_updates": {
				const jobDescription = input.body.mode === "clone_current"
					? existingSession.jobDescription
					: nextJobDescription
				const mutation = await sessionRepository.persistRetrySession({
					mode: input.body.mode,
					userId: input.userId,
					sessionId: existingSession.id,
					runId,
					name: input.body.mode === "clone_current" ? existingSession.name : nextName,
					jobTitle: input.body.mode === "clone_current" ? existingSession.jobTitle : nextJobTitle,
					jobDescription,
					files: currentFiles,
				})

				if (!mutation) {
					return usecaseFailure(500, {
						status: "error",
						message: "We couldn't start the new copied session.",
						details: "Please try again.",
						retryable: true,
						targetSessionId: null,
					})
				}

				const targetSessionId = mutation.targetSessionId
				try {
					await publishPipelineJob({
						session_id: targetSessionId,
						run_id: runId,
						job_description: jobDescription,
						files: currentFiles.map(file => ({
							file_id: file.fileId,
							storage_key: file.storageKey,
							original_name: file.originalName,
						})),
					})
				}
				catch {
					await sessionRepository.updateSessionFailure(targetSessionId, RETRY_CLONE_FAILED_MESSAGE)

					return usecaseFailure(500, {
						status: "error",
						message: "We couldn't start the new copied session.",
						details: "Please try again.",
						retryable: true,
						targetSessionId: targetSessionId,
					})
				}

				return usecaseSuccess({
					status: mutation.status,
					sessionId: targetSessionId,
					runId,
					totalConfirmed: currentFiles.length,
					action: input.body.mode,
					targetSessionId: targetSessionId,
				})
			}

			case "replace_with_updates": {
				const mutation = await sessionRepository.persistRetrySession({
					mode: input.body.mode,
					userId: input.userId,
					sessionId: existingSession.id,
					runId,
					name: nextName,
					jobTitle: nextJobTitle,
					jobDescription: nextJobDescription,
					files: currentFiles,
				})

				if (!mutation) {
					return usecaseFailure(500, {
						status: "error",
						message: "We couldn't restart processing.",
						details: "Please try again.",
						retryable: true,
						targetSessionId: existingSession.id,
					})
				}

				try {
					await publishPipelineJob({
						session_id: existingSession.id,
						run_id: runId,
						job_description: nextJobDescription,
						files: currentFiles.map(file => ({
							file_id: file.fileId,
							storage_key: file.storageKey,
							original_name: file.originalName,
						})),
					})
				}
				catch {
					await sessionRepository.updateSessionFailure(existingSession.id, RETRY_SESSION_FAILED_MESSAGE)

					return usecaseFailure(500, {
						status: "error",
						message: "We couldn't restart processing.",
						details: "Please try again.",
						retryable: true,
						targetSessionId: existingSession.id,
					})
				}

				return usecaseSuccess({
					status: mutation.status,
					sessionId: existingSession.id,
					runId,
					totalConfirmed: currentFiles.length,
					action: input.body.mode,
					targetSessionId: existingSession.id,
				})
			}
		}
	}
	catch {
		return usecaseFailure(500, {
			status: "error",
			message: "We couldn't restart processing.",
			details: "Please try again.",
			retryable: true,
			targetSessionId: input.body.mode === "clone_current" || input.body.mode === "clone_with_updates"
				? null
				: existingSession.id,
		})
	}
}
