import { randomUUIDv7 } from "bun"

import {
	screeningPipelineCallbackSchema,
	type ScreeningPipelinePayload,
} from "@resumemo/core/schemas"

import { apiEnv } from "~/config/env"
import { publishScreeningJob } from "~/lib/queue"
import { cleanupUploadedKeys, verifyUploads } from "~/lib/storage"
import { usecaseFailure, usecaseSuccess } from "~/usecases/result"

import type { ScreeningCreateSessionBody } from "./contracts"
import { screeningRepository } from "./repository"

const CALLBACK_SECRET = apiEnv.pipeline.callbackSecret

function hasValidSecret(secretHeader?: string | null) {
	return Boolean(CALLBACK_SECRET && secretHeader && secretHeader === CALLBACK_SECRET)
}

function normalizeSort(sort?: "asc" | "desc") {
	return sort === "asc" ? "asc" : "desc"
}

export async function createScreeningSession(input: {
	userId: string
	body: ScreeningCreateSessionBody
}) {
	const { body, userId } = input
	const { files } = body

	if (files.length === 0) {
		return usecaseFailure(400, {
			status: "error",
			message: "At least one file is required",
		})
	}

	for (const file of files) {
		if (!file.storageKey.startsWith(`${userId}/`)) {
			return usecaseFailure(403, {
				status: "error",
				message: "Storage key does not belong to this user",
			})
		}
	}

	const uploadFailures = await verifyUploads(files)
	if (uploadFailures.length > 0) {
		await cleanupUploadedKeys(files.map(file => file.storageKey))
		return usecaseFailure(400, {
			status: "error",
			message: "Upload verification failed",
			failures: uploadFailures,
		})
	}

	const usingTemplate = Boolean(body.jobDescriptionTemplateId)
	const usingInlineText = Boolean(body.jobDescriptionText?.trim())
	if (usingTemplate === usingInlineText) {
		return usecaseFailure(400, {
			status: "error",
			message: "Choose either a saved job description or inline job description text",
		})
	}

	const runId = randomUUIDv7()
	let jobDescription = null

	if (body.jobDescriptionTemplateId) {
		jobDescription = await screeningRepository.getOwnedJobDescription(userId, body.jobDescriptionTemplateId)
		if (!jobDescription) {
			return usecaseFailure(404, {
				status: "error",
				message: "Job description template not found",
			})
		}
	}

	const created = await screeningRepository.createSession({
		userId,
		name: body.name,
		jobTitle: body.jobTitle ?? jobDescription?.jobTitle ?? null,
		runId,
		files,
		jobDescription: jobDescription
			? {
				id: jobDescription.id,
				name: jobDescription.name,
				rawText: jobDescription.rawText,
				source: "template",
			}
			: {
				name: body.jobDescriptionName?.trim() || body.name,
				rawText: body.jobDescriptionText!.trim(),
				source: "inline",
			},
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

	const payload = {
		session_id: created.session.id,
		run_id: runId,
		job_description: {
			id: created.jobDescription.id,
			name: created.jobDescription.name,
			raw_text: created.jobDescription.rawText,
			job_title: created.jobDescription.jobTitle,
			source: created.jobDescription.source,
		},
		files: created.files.map(file => ({
			file_id: file.fileId,
			storage_key: file.storageKey,
			original_name: file.originalName,
		})),
	}

	try {
		await publishScreeningJob(payload)
	}
	catch {
		await screeningRepository.markSessionFailed(created.session.id, "We couldn't start processing. Please try again.")
		return usecaseFailure(500, {
			status: "error",
			message: "We couldn't start processing.",
			details: "Please try again.",
			retryable: true,
			targetSessionId: created.session.id,
		})
	}

	return usecaseSuccess({
		status: "processing",
		sessionId: created.session.id,
		runId,
		totalConfirmed: created.files.length,
	})
}

export async function listScreeningSessions(userId: string) {
	const sessions = await screeningRepository.listSessions(userId)
	return usecaseSuccess({ sessions })
}

export async function getScreeningSessionDetail(userId: string, sessionId: string) {
	const session = await screeningRepository.getOwnedSession(userId, sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const files = await screeningRepository.listSessionFiles(sessionId)
	const results = await screeningRepository.listSessionResults(sessionId, session.activeRunId, "desc")

	return usecaseSuccess({
		session,
		files,
		results,
	})
}

export async function listScreeningResults(input: {
	userId: string
	sessionId: string
	sort?: "asc" | "desc"
}) {
	const session = await screeningRepository.getOwnedSession(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const results = await screeningRepository.listSessionResults(
		input.sessionId,
		session.activeRunId,
		normalizeSort(input.sort),
	)

	return usecaseSuccess({ results })
}

export async function getScreeningResult(input: {
	userId: string
	sessionId: string
	resultId: string
}) {
	const session = await screeningRepository.getOwnedSession(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	const result = await screeningRepository.getSessionResult(
		input.sessionId,
		input.resultId,
		session.activeRunId,
	)

	if (!result) {
		return usecaseFailure(404, {
			status: "error",
			message: "Result not found",
		})
	}

	return usecaseSuccess({ result })
}

export async function listScreeningJobDescriptions(userId: string) {
	const templates = await screeningRepository.listJobDescriptions(userId)
	return usecaseSuccess({ templates })
}

export async function getScreeningJobDescription(userId: string, jobDescriptionId: string) {
	const template = await screeningRepository.getOwnedJobDescription(userId, jobDescriptionId)
	if (!template) {
		return usecaseFailure(404, {
			status: "error",
			message: "Job description template not found",
		})
	}

	return usecaseSuccess({ template })
}

export async function applyScreeningPipelineCallback(input: {
	body: unknown
	secretHeader?: string | null
}) {
	if (!hasValidSecret(input.secretHeader)) {
		return usecaseFailure(401, {
			status: "error",
			message: "Unauthorized",
		})
	}

	const parsed = screeningPipelineCallbackSchema.safeParse(input.body)
	if (!parsed.success) {
		return usecaseFailure(400, {
			status: "error",
			message: "Invalid callback payload",
		})
	}

	const payload = parsed.data
	const session = await screeningRepository.getSession(payload.session_id)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	if (!session.activeRunId || session.activeRunId !== payload.run_id)
		return usecaseSuccess({ status: "ok", skipped: true })

	const applied = await screeningRepository.applyPipelineUpdate({
		sessionId: payload.session_id,
		runId: payload.run_id,
		status: payload.type === "completion" ? "completed" : "failed",
		error: payload.type === "error" ? payload.error : undefined,
		jobDescriptionArtifact: payload.job_description_artifact ?? null,
		results: payload.type === "completion" ? payload.results : payload.partial_results,
	})

	if (!applied)
		return usecaseSuccess({ status: "ok", skipped: true })

	return usecaseSuccess({ status: "ok" })
}
