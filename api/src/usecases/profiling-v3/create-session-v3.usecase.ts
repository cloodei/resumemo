import { randomUUIDv7 } from "bun"

import { publishPipelineJobV3 } from "~/lib/queue"
import { profilingV3Repository } from "~/repositories/profiling-v3-repository"
import type { CreateSessionV3Body } from "~/schemas/session-v3"
import { usecaseFailure, usecaseSuccess } from "../result"
import { cleanupUploadedKeys, verifyUploads } from "~/lib/storage"

const CREATE_SESSION_FAILED_MESSAGE = "We couldn't start processing. Please try again."

/**
 * Creates a v3 profiling session for the authenticated user and starts pipeline processing.
 *
 * Validation and flow summary:
 * - Requires at least one uploaded file.
 * - Requires either a saved job description template or inline job description text.
 * - Verifies that all storage keys belong to the current user and that uploads exist.
 * - Reuses a selected template or creates a new inline template.
 * - Persists the session, then publishes a pipeline job with a new run id.
 *
 * Returns a usecase failure for validation/authorization/persistence/queue errors,
 * and a processing payload with session and run metadata on success.
 *
 * @param input - Authenticated user id plus validated create-session request body.
 * @returns Standardized usecase result with failure status details or processing metadata.
 */
export async function createSessionV3Usecase(input: {
	userId: string
	body: CreateSessionV3Body
}) {
	const {
		name,
		jobDescriptionTemplateId,
		jobDescriptionName,
		jobDescriptionText,
		jobTitle,
		files,
	} = input.body

	if (files.length === 0) {
		return usecaseFailure(400, {
			status: "error",
			message: "At least one file is required",
		})
	}

	if (!jobDescriptionTemplateId && !jobDescriptionText?.trim()) {
		return usecaseFailure(400, {
			status: "error",
			message: "Either a saved job description or raw job description text is required",
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

	const jobDescription = jobDescriptionTemplateId
		? await profilingV3Repository.getOwnedJobDescriptionById(input.userId, jobDescriptionTemplateId)
		: await profilingV3Repository.createJobDescription({
			userId: input.userId,
			name: jobDescriptionName?.trim() || jobTitle?.trim() || name,
			jobTitle: jobTitle?.trim() || null,
			rawText: jobDescriptionText!.trim(),
			source: "inline",
		})

	if (!jobDescription) {
		return usecaseFailure(404, {
			status: "error",
			message: "Job description template not found",
		})
	}

	const runId = randomUUIDv7()
	const created = await profilingV3Repository.createSession({
		userId: input.userId,
		name,
		jobDescriptionId: jobDescription.id,
		jobTitleSnapshot: jobTitle?.trim() || jobDescription.jobTitle || null,
		runId,
		files,
	})

	if (!created) {
		return usecaseFailure(500, {
			status: "error",
			message: CREATE_SESSION_FAILED_MESSAGE,
		})
	}

	try {
		await publishPipelineJobV3({
			session_id: created.session.id,
			run_id: runId,
			job_description: {
				id: jobDescription.id,
				name: jobDescription.name,
				raw_text: jobDescription.rawText,
				job_title: jobDescription.jobTitle,
				source: jobDescriptionTemplateId ? "template" : jobDescription.source,
			},
			files: created.files.map(file => ({
				file_id: file.fileId,
				storage_key: file.storageKey,
				original_name: file.originalName,
			})),
		})
	}
	catch {
		await profilingV3Repository.updateSessionFailure(created.session.id, CREATE_SESSION_FAILED_MESSAGE)

		return usecaseFailure(500, {
			status: "error",
			message: CREATE_SESSION_FAILED_MESSAGE,
			targetSessionId: created.session.id,
		})
	}

	await profilingV3Repository.touchJobDescription(jobDescription.id, jobDescription.latestArtifact ?? null)

	return usecaseSuccess({
		status: "processing",
		sessionId: created.session.id,
		runId,
		jobDescriptionId: jobDescription.id,
		totalConfirmed: created.files.length,
	})
}
