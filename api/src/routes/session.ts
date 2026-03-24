import { Elysia, t } from "elysia";
import { randomUUIDv7 } from "bun";

import { MAX_FILES_PER_SESSION } from "@resumemo/core/constants/file-uploads";

import { sessionRepository } from "~/repositories/session-repository";
import { authMiddleware } from "~/lib/auth";
import { publishPipelineJob } from "~/lib/queue";
import { validateFileMetadata } from "~/lib/upload-guard";
import { isSessionRepositoryFailure } from "~/types";
import {
	generatePresignedUploadUrl,
	generateStorageKey,
	cleanupUploadedKeys,
	verifyUploads,
} from "~/lib/storage";

const CREATE_SESSION_FAILED_MESSAGE = "We couldn't start processing. Please try again.";
const RETRY_SESSION_FAILED_MESSAGE = "We couldn't restart processing. Please try again.";
const RETRY_CLONE_FAILED_MESSAGE = "We couldn't start the new copied session. Please try again.";

export const sessionRoutes = new Elysia({ prefix: "/api/v2/sessions" })
	.use(authMiddleware)
	.post(
		"/presign",
		async ({ user, body, status }) => {
			const { files } = body;

			const distinctClientIds = new Set(files.map(file => file.clientId));
			if (distinctClientIds.size !== files.length) {
				return status(400, {
					status: "error",
					message: "Each file must have a unique clientId",
					errors: null,
				});
			}

			const metadataErrors = files
				.map((file) => {
					const check = validateFileMetadata({
						fileName: file.fileName,
						claimedMimeType: file.mimeType,
						size: file.size,
					});
					if (check.ok)
						return null;

					return {
						clientId: file.clientId,
						reason: check.message,
					};
				})
				.filter(issue => issue !== null);

			if (metadataErrors.length > 0) {
				return status(400, {
					status: "error",
					message: "Metadata validation failed",
					errors: metadataErrors,
				});
			}

			const uploads = await Promise.all(
				files.map(async (file) => {
					const storageKey = generateStorageKey(user.id, file.fileName);
					return {
						clientId: file.clientId,
						storageKey,
						uploadUrl: await generatePresignedUploadUrl(storageKey, file.mimeType, file.size),
					};
				}),
			);

			return { status: "ok", uploads };
		},
		{
			auth: true,
			body: t.Object({
				files: t.Array(
					t.Object({
						clientId: t.Number(),
						fileName: t.String({ minLength: 1, maxLength: 512 }),
						mimeType: t.String({ minLength: 1, maxLength: 128 }),
						size: t.Number({ minimum: 1 }),
					}),
					{ minItems: 1, maxItems: MAX_FILES_PER_SESSION },
				),
			}),
		},
	)

	.post(
		"/create",
		async ({ user, body, status }) => {
			const { name, jobDescription, jobTitle, files } = body;

			if (files.length === 0) {
				return status(400, {
					status: "error",
					message: "At least one file is required",
				});
			}

			for (const file of files) {
				if (!file.storageKey.startsWith(`${user.id}/`)) {
					return status(403, {
						status: "error",
						message: "Storage key does not belong to this user",
					});
				}
			}

			const failures = await verifyUploads(files);

			if (failures.length > 0) {
				await cleanupUploadedKeys(files.map(file => file.storageKey));

				return status(400, {
					status: "error",
					message: "Upload verification failed",
					failures,
				});
			}

			let sessionId = "";
			let sessionPersisted = false;
			try {
				const runId = randomUUIDv7();
				const created = await sessionRepository.createSession({
					userId: user.id,
					name,
					jobDescription,
					jobTitle: jobTitle ?? null,
					runId,
					files,
				});

				sessionId = created.session.id;
				sessionPersisted = true;

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
					});
				}
				catch (error) {
					await sessionRepository.updateSessionFailure(sessionId, CREATE_SESSION_FAILED_MESSAGE);

					throw error;
				}

				return {
					status: "processing" as const,
					sessionId,
					runId,
					totalConfirmed: files.length,
				};
			}
			catch {
				return status(500, {
					status: "error",
					message: "We couldn't start processing.",
					details: "Please try again.",
					retryable: true,
					targetSessionId: sessionPersisted ? sessionId : null,
				});
			}
		},
		{
			auth: true,
			body: t.Object({
				name: t.String({ minLength: 1, maxLength: 255 }),
				jobDescription: t.String({ minLength: 1, maxLength: 5000 }),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
				files: t.Array(
					t.Object({
						storageKey: t.String({ minLength: 1 }),
						fileName: t.String({ minLength: 1, maxLength: 512 }),
						mimeType: t.String({ minLength: 1, maxLength: 128 }),
						size: t.Number({ minimum: 1 }),
					}),
					{ minItems: 1, maxItems: MAX_FILES_PER_SESSION },
				),
			}),
		},
	)


	.post(
		"/:id/retry",
		async ({ user, params, body, status }) => {
			const preview = await sessionRepository.listFilesFromSessionByUserId(user.id, params.id);
			if (isSessionRepositoryFailure(preview))
				return status(404, { status: "error", message: preview.error.message });

			const { session: existingSession, files: currentFiles } = preview.data;
			if (existingSession.status === "processing" || existingSession.status === "retrying")
				return status(409, { status: "error", message: "This session is already running" });

			if (currentFiles.length === 0) {
				return status(404, {
					status: "error",
					message: "Files not found for this session",
				});
			}

			const reusableFailures = await verifyUploads(currentFiles.map(file => ({
				storageKey: file.storageKey,
				fileName: file.originalName,
				mimeType: file.mimeType,
				size: Number(file.size),
			})));

			if (reusableFailures.length > 0) {
				return status(409, {
					status: "error",
					message: "Some existing uploads are no longer available for retry",
					failures: reusableFailures,
				});
			}

			const nextName = body.name?.trim() || existingSession.name;
			const nextJobTitle = body.jobTitle !== undefined
				? body.jobTitle.trim() || null
				: existingSession.jobTitle;
			const nextJobDescription = body.jobDescription?.trim() || existingSession.jobDescription;

			try {
				switch (body.mode) {
					case "rerun_current": {
						const runId = randomUUIDv7();
						await sessionRepository.persistRetrySession({
							mode: body.mode,
							userId: user.id,
							sessionId: existingSession.id,
							runId,
							name: existingSession.name,
							jobTitle: existingSession.jobTitle,
							jobDescription: existingSession.jobDescription,
							files: currentFiles,
						});

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
							});
						}
						catch {
							await sessionRepository.updateSessionFailure(existingSession.id, RETRY_SESSION_FAILED_MESSAGE);

							return status(500, {
								status: "error",
								message: "We couldn't restart processing.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: existingSession.id,
							});
						}

						return {
							status: "retrying" as const,
							sessionId: existingSession.id,
							runId,
							totalConfirmed: currentFiles.length,
							action: "rerun_current",
							targetSessionId: existingSession.id,
						};
					}

					case "clone_current": {
						const runId = randomUUIDv7();
						const mutation = await sessionRepository.persistRetrySession({
							mode: body.mode,
							userId: user.id,
							sessionId: existingSession.id,
							runId,
							name: existingSession.name,
							jobTitle: existingSession.jobTitle,
							jobDescription: existingSession.jobDescription,
							files: currentFiles,
						});
						const sessionId = mutation.targetSessionId;

						try {
							await publishPipelineJob({
								session_id: sessionId,
								run_id: runId,
								job_description: existingSession.jobDescription,
								files: currentFiles.map(file => ({
									file_id: file.fileId,
									storage_key: file.storageKey,
									original_name: file.originalName,
								})),
							});
						}
						catch {
							await sessionRepository.updateSessionFailure(sessionId, RETRY_CLONE_FAILED_MESSAGE);

							return status(500, {
								status: "error",
								message: "We couldn't start the new copied session.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: sessionId,
							});
						}

						return {
							status: "processing" as const,
							sessionId,
							runId,
							totalConfirmed: currentFiles.length,
							action: "clone_current",
							targetSessionId: sessionId,
						};
					}

					case "clone_with_updates": {
						const runId = randomUUIDv7();
						const mutation = await sessionRepository.persistRetrySession({
							mode: body.mode,
							userId: user.id,
							sessionId: existingSession.id,
							runId,
							name: nextName,
							jobTitle: nextJobTitle,
							jobDescription: nextJobDescription,
							files: currentFiles,
						});
						const sessionId = mutation.targetSessionId;

						try {
							await publishPipelineJob({
								session_id: sessionId,
								run_id: runId,
								job_description: nextJobDescription,
								files: currentFiles.map(file => ({
									file_id: file.fileId,
									storage_key: file.storageKey,
									original_name: file.originalName,
								})),
							});
						}
						catch {
							await sessionRepository.updateSessionFailure(sessionId, RETRY_CLONE_FAILED_MESSAGE);

							return status(500, {
								status: "error",
								message: "We couldn't start the new copied session.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: sessionId,
							});
						}

						return {
							status: "processing" as const,
							sessionId,
							runId,
							totalConfirmed: currentFiles.length,
							action: "clone_with_updates",
							targetSessionId: sessionId,
						};
					}

					case "replace_with_updates": {
						const runId = randomUUIDv7();
						await sessionRepository.persistRetrySession({
							mode: body.mode,
							userId: user.id,
							sessionId: existingSession.id,
							runId,
							name: nextName,
							jobTitle: nextJobTitle,
							jobDescription: nextJobDescription,
							files: currentFiles,
						});

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
							});
						}
						catch {
							await sessionRepository.updateSessionFailure(existingSession.id, RETRY_SESSION_FAILED_MESSAGE);

							return status(500, {
								status: "error",
								message: "We couldn't restart processing.",
								details: "Please try again.",
								retryable: true,
								targetSessionId: existingSession.id,
							});
						}

						return {
							status: "retrying" as const,
							sessionId: existingSession.id,
							runId,
							totalConfirmed: currentFiles.length,
							action: "replace_with_updates",
							targetSessionId: existingSession.id,
						};
					}
				}
			}
			catch {
				return status(500, {
					status: "error",
					message: "We couldn't restart processing.",
					details: "Please try again.",
					retryable: true,
					targetSessionId: body.mode === "clone_current" || body.mode === "clone_with_updates"
						? null
						: existingSession.id,
				});
			}
		},
		{
			auth: true,
			body: t.Object({
				mode: t.Union([
					t.Literal("rerun_current"),
					t.Literal("clone_current"),
					t.Literal("clone_with_updates"),
					t.Literal("replace_with_updates"),
				]),
				name: t.Optional(t.String({ minLength: 1, maxLength: 255 })),
				jobTitle: t.Optional(t.String({ maxLength: 255 })),
				jobDescription: t.Optional(t.String({ minLength: 1, maxLength: 5000 })),
			}),
		},
	)


	.get("/", async ({ user }) => await sessionRepository.listSessionsByUserId(user.id), { auth: true })

	.get(
		"/:id",
		async ({ user, params, status }) => {
			const response = await sessionRepository.getSessionDetailByUserId(user.id, params.id);

			if (isSessionRepositoryFailure(response))
				return status(404, { status: "error", message: response.error.message });

			return response.data;
		},
		{ auth: true },
	)
	.get(
		"/:id/results",
		async ({ user, params, status, query }) => {
			const sort = query.sort === "asc" ? "asc" : "desc";
			const response = await sessionRepository.listSessionResultsByUserId(user.id, params.id, sort);

			if (isSessionRepositoryFailure(response))
				return status(404, { status: "error", message: response.error.message });

			return response.data;
		},
		{
			auth: true,
			query: t.Object({
				sort: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
			}),
		},
	)
	.get(
		"/:id/results/:resultId",
		async ({ user, params, status }) => {
			const response = await sessionRepository.getSessionResultByUserId(user.id, params.id, params.resultId);

			if (isSessionRepositoryFailure(response))
				return status(404, { status: "error", message: response.error.message });

			return response.data;
		},
		{ auth: true },
	)
	.get(
		"/:id/export",
		async ({ user, params, status, query, set }) => {
			const exportData = await sessionRepository.getSessionExportByUserId(user.id, params.id);
			if (isSessionRepositoryFailure(exportData)) {
				if (exportData.error.code === "session-not-completed")
					return status(409, { status: "error", message: exportData.error.message });

				return status(404, { status: "error", message: exportData.error.message });
			}

			const { session, results: filteredResults } = exportData.data;
			const format = query.format ?? "json";

			if (format === "csv") {
				const csvHeaders = [
					"Rank",
					"Candidate",
					"Email",
					"Phone",
					"Match Score",
					"Summary",
					"Top Skills",
					"Experience",
					"Resume File",
				];

				const csvRows = filteredResults.map((result, index) => [
					String(index + 1),
					escapeCsv(buildDisplayName(result.candidateName, result.originalName, result.parsedProfile)),
					escapeCsv(result.candidateEmail ?? ""),
					escapeCsv(result.candidatePhone ?? ""),
					String(result.overallScore),
					escapeCsv(stripMarkup(result.summary)),
					escapeCsv(Array.isArray(result.skillsMatched) ? result.skillsMatched.join("; ") : ""),
					escapeCsv(getExperienceLabel(result.parsedProfile)),
					escapeCsv(result.originalName),
				].join(","));

				const csv = [csvHeaders.join(","), ...csvRows].join("\n");
				const safeName = session.name.replace(/[^a-zA-Z0-9_-]/g, "_");

				set.headers["content-type"] = "text/csv; charset=utf-8";
				set.headers["content-disposition"] = `attachment; filename="${safeName}-results.csv"`;

				return csv;
			}

			return {
				sessionId: session.id,
				sessionName: session.name,
				exportedAt: new Date().toISOString(),
				totalResults: filteredResults.length,
				results: filteredResults.map((result, index) => ({
					rank: index + 1,
					...result,
				})),
			};
		},
		{
			auth: true,
			query: t.Object({
				format: t.Optional(t.Union([t.Literal("json"), t.Literal("csv")])),
			}),
		},
	);

function escapeCsv(value: string) {
	if (value.includes(",") || value.includes('"') || value.includes("\n"))
		return `"${value.replace(/"/g, '""')}"`;

	return value;
}

function buildDisplayName(candidateName: string | null, originalName: string, parsedProfile: unknown) {
	const confidence = Number((parsedProfile as { name_confidence?: number } | null)?.name_confidence ?? 0);
	if (candidateName && confidence >= 0.5)
		return candidateName;

	return originalName;
}

function getExperienceLabel(parsedProfile: unknown) {
	const years = (parsedProfile as { total_experience_years?: number } | null)?.total_experience_years;
	if (typeof years !== "number")
		return "";

	return `${years} year${years === 1 ? "" : "s"}`;
}

function stripMarkup(value: string) {
	return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
