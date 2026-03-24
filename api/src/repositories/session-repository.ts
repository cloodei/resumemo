import { and, eq } from "drizzle-orm"

import * as schema from "@resumemo/core/schemas"
import * as sessionQueries from "~/sql/session"
import { db } from "~/lib/db"
import { repositoryCache, sessionRepositoryCacheKeys, type CacheKey } from "~/lib/repository-cache"
import {
	// type RetryFile,
	type SessionSort,
	type SessionFileView,
	type SessionListItem,
	type SessionResultSummary,
	type SessionRepositoryResult,
	success,
	failure,
	isSessionRepositoryFailure,
} from "~/types"

type CandidateResultRow = typeof schema.candidateResult.$inferSelect

export type SessionCreateInputFile = {
	storageKey: string
	fileName: string
	mimeType: string
	size: number
}

export type SessionCreatedFileRecord = {
	fileId: number
	storageKey: string
	originalName: string
	mimeType: string
	size: bigint
}

export type CreateSessionInput = {
	userId: string
	name: string
	jobDescription: string
	jobTitle: string | null
	runId: string
	files: SessionCreateInputFile[]
}

export type RetryMutationInput = {
	mode: "rerun_current" | "clone_current" | "clone_with_updates" | "replace_with_updates"
	userId: string
	sessionId: string
	runId: string
	name: string
	jobTitle: string | null
	jobDescription: string
	files: SessionFileView[]
}

export type SessionResultUpsertInput = {
	file_id: number
	candidate_name: string | null
	candidate_email: string | null
	candidate_phone: string | null
	raw_text: string
	parsed_profile: Record<string, unknown>
	overall_score: number
	score_breakdown: Record<string, unknown>
	summary: string
	skills_matched: string[]
}


async function getCachedProjection<T>(
	key: CacheKey<T>,
	loader: () => Promise<SessionRepositoryResult<T>>,
) {
	const cached = repositoryCache.get(key)
	if (cached !== undefined)
		return success(cached)

	const result = await loader()
	if (result.ok)
		repositoryCache.set(key, result.data)

	return result
}

function patchSessionListEntry(sessions: SessionListItem[], nextSession: SessionListItem, prependIfMissing?: boolean) {
	let found = false
	const patched = sessions.map((session) => {
		if (session.id !== nextSession.id)
			return session

		found = true
		return { ...session, ...nextSession }
	})

	if (!found && prependIfMissing)
		return [nextSession, ...patched]

	return patched
}

function setSessionResultsCaches(
	userId: string,
	sessionId: string,
	activeRunId: string | null,
	sessionStatus: SessionListItem["status"],
	results: SessionResultSummary[],
) {
	const ascResults = [...results].sort((left, right) => Number(left.overallScore) - Number(right.overallScore))
	const descResults = [...results].sort((left, right) => Number(right.overallScore) - Number(left.overallScore))

	repositoryCache.set(sessionRepositoryCacheKeys.resultsData(sessionId, "asc", activeRunId), ascResults)
	repositoryCache.set(sessionRepositoryCacheKeys.resultsData(sessionId, "desc", activeRunId), descResults)
	repositoryCache.set(sessionRepositoryCacheKeys.results(userId, sessionId, "asc"), {
		sessionId,
		sessionStatus,
		totalResults: ascResults.length,
		results: ascResults,
	})
	repositoryCache.set(sessionRepositoryCacheKeys.results(userId, sessionId, "desc"), {
		sessionId,
		sessionStatus,
		totalResults: descResults.length,
		results: descResults,
	})

	for (const result of results) {
		repositoryCache.delete(sessionRepositoryCacheKeys.result(userId, sessionId, result.id))
	}
}

function primeSessionCaches(payload: {
	session: SessionListItem
	files: SessionFileView[]
	results?: SessionResultSummary[] | null
}) {
	repositoryCache.set(sessionRepositoryCacheKeys.entity(payload.session.id), payload.session)
	repositoryCache.set(sessionRepositoryCacheKeys.files(payload.session.id), payload.files)
	repositoryCache.update(
		sessionRepositoryCacheKeys.list(payload.session.userId),
		current => ({ sessions: patchSessionListEntry(current.sessions, payload.session, true) }),
	)

	repositoryCache.set(sessionRepositoryCacheKeys.detail(payload.session.userId, payload.session.id), payload)
	setSessionResultsCaches(
		payload.session.userId,
		payload.session.id,
		payload.session.activeRunId,
		payload.session.status,
		payload.results ?? []
	)
}

function patchSessionState(payload: {
	session: SessionListItem
	files: SessionFileView[]
	results?: SessionResultSummary[] | null
}) {
	repositoryCache.set(sessionRepositoryCacheKeys.entity(payload.session.id), payload.session)
	repositoryCache.set(sessionRepositoryCacheKeys.files(payload.session.id), payload.files)
	repositoryCache.update(
		sessionRepositoryCacheKeys.list(payload.session.userId),
		current => ({ sessions: patchSessionListEntry(current.sessions, payload.session) }),
	)
	repositoryCache.update(
		sessionRepositoryCacheKeys.detail(payload.session.userId, payload.session.id),
		() => payload,
	)

	setSessionResultsCaches(
		payload.session.userId,
		payload.session.id,
		payload.session.activeRunId,
		payload.session.status,
		payload.results ?? []
	)
}

async function selectOwnedSession(userId: string, sessionId: string) {
	const cached = repositoryCache.get(sessionRepositoryCacheKeys.entity(sessionId))
	if (cached && cached.userId === userId)
		return cached

	const rows = await sessionQueries.selectOwnedSessionStatement.execute({ userId, sessionId })
	const session = rows[0] ?? null
	if (session)
		repositoryCache.set(sessionRepositoryCacheKeys.entity(sessionId), session)

	return session
}

async function selectSessionFiles(sessionId: string) {
	const cached = repositoryCache.get(sessionRepositoryCacheKeys.files(sessionId))
	if (cached)
		return cached

	const rows = await sessionQueries.selectSessionFilesStatement.execute({ sessionId })
	const files = rows.map(file => ({
		fileId: file.fileId,
		originalName: file.originalName,
		storageKey: file.storageKey,
		mimeType: file.mimeType,
		size: Number(file.size),
	}))

	repositoryCache.set(sessionRepositoryCacheKeys.files(sessionId), files)
	return files
}

async function selectSessionResults(sessionId: string, sort: SessionSort, activeRunId: string | null) {
	const cached = repositoryCache.get(sessionRepositoryCacheKeys.resultsData(sessionId, sort, activeRunId))
	if (cached)
		return cached

	const rows = sort === "asc"
		? await sessionQueries.selectSessionResultsByScoreAscStatement.execute({ sessionId })
		: await sessionQueries.selectSessionResultsByScoreDescStatement.execute({ sessionId })

	const results = activeRunId
		? rows.filter(result => result.runId === activeRunId)
		: rows
	repositoryCache.set(sessionRepositoryCacheKeys.resultsData(sessionId, sort, activeRunId), results)

	return results
}

export const sessionRepository = {
	async getSessionById(sessionId: string) {
		return await getCachedProjection(sessionRepositoryCacheKeys.entity(sessionId), async () => {
			const rows = await sessionQueries.selectSessionByIdStatement.execute({ sessionId })
			const [session] = rows
			if (!session)
				return failure("session-not-found", "Session not found")

			return success(session)
		})
	},

	async listFilesFromSessionByUserId(userId: string, sessionId: string) {
		return await getCachedProjection(sessionRepositoryCacheKeys.entityDetail(sessionId), async () => {
			const session = await selectOwnedSession(userId, sessionId)
			if (!session)
				return failure("session-not-found", "Session not found")

			const files = await selectSessionFiles(sessionId)
			if (files.length === 0)
				return failure("files-not-found", "Files not found")

			// const rows = await sessionQueries.selectOwnedSessionRetryRowStatement.execute({ userId, sessionId })
			// const [session] = rows
			// if (!session)
			// 	return failure("session-not-found", "Session not found")

			// const files = await sessionQueries.selectSessionRetryFilesStatement.execute({ sessionId })
			// if (files.length === 0)
			// 	return failure("files-not-found", "Files not found")

			return success({ session, files })
		})
	},

	async listSessionsByUserId(userId: string) {
		return await repositoryCache.getOrLoad(
			sessionRepositoryCacheKeys.list(userId),
			async () => {
				const sessions = await sessionQueries.selectSessionsByUserIdStatement.execute({ userId })
				for (const session of sessions)
					repositoryCache.set(sessionRepositoryCacheKeys.entity(session.id), session)

				return { sessions }
			},
		)
	},

	async getSessionDetailByUserId(userId: string, sessionId: string) {
		return await getCachedProjection(sessionRepositoryCacheKeys.detail(userId, sessionId), async () => {
			const session = await selectOwnedSession(userId, sessionId)
			if (!session)
				return failure("session-not-found", "Session not found")

			const files = await selectSessionFiles(sessionId)
			if (files.length === 0)
				return failure("files-not-found", "Files not found")

			return success({
				session,
				files,
				results: session.status === "completed"
					? await selectSessionResults(sessionId, "desc", session.activeRunId ?? null)
					: null,
			})
		})
	},

	async listSessionResultsByUserId(userId: string, sessionId: string, sort: SessionSort) {
		return await getCachedProjection(sessionRepositoryCacheKeys.results(userId, sessionId, sort), async () => {
			const session = await selectOwnedSession(userId, sessionId)
			if (!session)
				return failure("session-not-found", "Session not found")

			const results = await selectSessionResults(sessionId, sort, session.activeRunId ?? null)
			return success({
				sessionId,
				sessionStatus: session.status,
				totalResults: results.length,
				results,
			})
		})
	},

	async getSessionResultByUserId(userId: string, sessionId: string, resultId: string) {
		return await getCachedProjection(sessionRepositoryCacheKeys.result(userId, sessionId, resultId), async () => {
			const session = await selectOwnedSession(userId, sessionId)
			if (!session)
				return failure("session-not-found", "Session not found")

			const rows = await sessionQueries.selectSessionResultByIdStatement.execute({ sessionId, resultId })
			const [result] = session.activeRunId
				? rows.filter(result => result.runId === session.activeRunId)
				: rows
			if (!result)
				return failure("result-not-found", "Result not found")

			return success({ result })
		})
	},

	async getSessionExportByUserId(userId: string, sessionId: string) {
		const session = await selectOwnedSession(userId, sessionId)
		if (!session)
			return failure("session-not-found", "Session not found")
		if (session.status !== "completed")
			return failure("session-not-completed", "Session is not completed yet")

		const resultsResponse = await this.listSessionResultsByUserId(userId, sessionId, "desc")
		if (isSessionRepositoryFailure(resultsResponse))
			return resultsResponse

		return success({
			session: {
				id: session.id,
				name: session.name,
				status: session.status,
				activeRunId: session.activeRunId,
			},
			results: resultsResponse.data.results,
		})
	},

	async createSession(input: CreateSessionInput) {
		let sessionSnapshot: SessionListItem | undefined
		let createdFiles: SessionCreatedFileRecord[] = []

		await db.transaction(async (tx) => {
			const [[createdSession], created] = await Promise.all([
				tx.insert(schema.profilingSession)
					.values({
						userId: input.userId,
						name: input.name,
						jobDescription: input.jobDescription,
						jobTitle: input.jobTitle,
						status: "processing",
						activeRunId: input.runId,
						totalFiles: input.files.length,
						errorMessage: null,
						lastCompletedAt: null,
					})
					.returning(),
				tx.insert(schema.resumeFile)
					.values(input.files.map(file => ({
						userId: input.userId,
						originalName: file.fileName,
						mimeType: file.mimeType,
						size: BigInt(file.size),
						storageKey: file.storageKey,
					})))
					.returning({
						fileId: schema.resumeFile.id,
						storageKey: schema.resumeFile.storageKey,
						originalName: schema.resumeFile.originalName,
						mimeType: schema.resumeFile.mimeType,
						size: schema.resumeFile.size,
					}),
			])

			createdFiles = created
			await tx.insert(schema.profilingSessionFile).values(
				createdFiles.map(file => ({
					sessionId: createdSession.id,
					fileId: file.fileId,
				})),
			)

			sessionSnapshot = createdSession
		})

		if (!sessionSnapshot)
			throw new Error("Session create transaction did not return a session")

		primeSessionCaches({
			session: sessionSnapshot,
			files: createdFiles.map(file => ({
				fileId: file.fileId,
				storageKey: file.storageKey,
				originalName: file.originalName,
				mimeType: file.mimeType,
				size: Number(file.size),
			})),
			results: [],
		})

		return { session: sessionSnapshot, files: createdFiles, totalConfirmed: createdFiles.length }
	},

	async updateSessionFailure(sessionId: string, message: string) {
		const [session] = await sessionQueries.updateSessionFailureStatement.execute({
			sessionId,
			status: "failed",
			errorMessage: message,
			lastCompletedAt: null,
		})

		if (!session)
			return

		patchSessionState({
			session,
			files: await selectSessionFiles(sessionId),
			results: [],
		})
		// repositoryCache.deleteWhere(key => key.startsWith(`session:result:${userId}:${sessionId}:`))
	},

	async persistRetrySession(input: RetryMutationInput) {
		if (input.mode === "clone_current" || input.mode === "clone_with_updates") {
			let sessionSnapshot: SessionListItem | undefined
			await db.transaction(async (tx) => {
				const [createdSession] = await tx.insert(schema.profilingSession)
					.values({
						userId: input.userId,
						name: input.name,
						jobDescription: input.jobDescription,
						jobTitle: input.jobTitle,
						status: "processing",
						activeRunId: input.runId,
						totalFiles: input.files.length,
						errorMessage: null,
						lastCompletedAt: null,
					})
					.returning()

				await tx.insert(schema.profilingSessionFile).values(
					input.files.map(file => ({
						sessionId: createdSession.id,
						fileId: file.fileId,
					})),
				)

				sessionSnapshot = createdSession
			})

			if (!sessionSnapshot)
				throw new Error("Clone retry transaction did not return a session")

			primeSessionCaches({
				session: sessionSnapshot,
				files: input.files.map(file => ({
					fileId: file.fileId,
					storageKey: file.storageKey,
					originalName: file.originalName,
					mimeType: file.mimeType,
					size: Number(file.size),
				})),
				results: [],
			})

			return {
				targetSessionId: sessionSnapshot.id,
				status: "processing" as const,
			}
		}

		const [session] = await sessionQueries.updateSessionRetryStateStatement.execute({
			sessionId: input.sessionId,
			name: input.name,
			jobTitle: input.jobTitle,
			jobDescription: input.jobDescription,
			status: "retrying",
			activeRunId: input.runId,
			errorMessage: null,
			lastCompletedAt: null,
			totalFiles: input.files.length,
		})

		if (!session)
			throw new Error("Retry update did not return a session")

		patchSessionState({
			session,
			files: input.files.map(file => ({
				fileId: file.fileId,
				storageKey: file.storageKey,
				originalName: file.originalName,
				mimeType: file.mimeType,
				size: Number(file.size),
			})),
			results: [],
		})

		return {
			targetSessionId: session.id,
			status: "retrying" as const,
		}
	},

	async replaceRunResultsAndSetCompleted(params: {
		userId: string
		sessionId: string
		runId: string
		results: SessionResultUpsertInput[]
	}) {
		let session: SessionListItem | null = null
		let insertedResults: CandidateResultRow[] = []

		await db.transaction(async (tx) => {
			const [_, updatedSessions, inserted] = await Promise.all([
				tx.delete(schema.candidateResult).where(
					and(
						eq(schema.candidateResult.sessionId, params.sessionId),
						eq(schema.candidateResult.runId, params.runId),
					),
				),
				tx.update(schema.profilingSession)
					.set({ status: "completed", errorMessage: null, lastCompletedAt: new Date() })
					.where(
						and(
							eq(schema.profilingSession.id, params.sessionId),
							eq(schema.profilingSession.activeRunId, params.runId),
						),
					)
					.returning(),
				params.results.length > 0
					? tx.insert(schema.candidateResult)
							.values(
								params.results.map(result => ({
									sessionId: params.sessionId,
									runId: params.runId,
									fileId: result.file_id,
									candidateName: result.candidate_name,
									candidateEmail: result.candidate_email,
									candidatePhone: result.candidate_phone,
									rawText: result.raw_text,
									parsedProfile: result.parsed_profile,
									overallScore: String(result.overall_score),
									scoreBreakdown: result.score_breakdown,
									summary: result.summary,
									skillsMatched: result.skills_matched,
								})))
							.returning()
					: [],
			])

			session = updatedSessions[0] ?? null
			insertedResults = inserted
		})

		if (!session)
			return

		const files = await selectSessionFiles(params.sessionId)
		const fileMap = new Map(files.map(file => [file.fileId, file]))
		const summaries = insertedResults.map(result => ({
			id: result.id,
			runId: result.runId,
			fileId: result.fileId,
			candidateName: result.candidateName,
			candidateEmail: result.candidateEmail,
			candidatePhone: result.candidatePhone,
			parsedProfile: result.parsedProfile,
			overallScore: result.overallScore,
			summary: result.summary,
			skillsMatched: result.skillsMatched,
			createdAt: result.createdAt,
			originalName: fileMap.get(result.fileId)?.originalName ?? "Unknown file",
		}))

		patchSessionState({ session, files, results: summaries })

		for (const result of insertedResults) {
			const file = fileMap.get(result.fileId)
			repositoryCache.set(sessionRepositoryCacheKeys.result(params.userId, params.sessionId, result.id), {
				result: {
					id: result.id,
					runId: result.runId,
					sessionId: result.sessionId,
					fileId: result.fileId,
					candidateName: result.candidateName,
					candidateEmail: result.candidateEmail,
					candidatePhone: result.candidatePhone,
					rawText: result.rawText,
					parsedProfile: result.parsedProfile,
					overallScore: result.overallScore,
					scoreBreakdown: result.scoreBreakdown,
					summary: result.summary,
					skillsMatched: result.skillsMatched,
					createdAt: result.createdAt,
					originalName: file?.originalName ?? "Unknown file",
					mimeType: file?.mimeType ?? "application/octet-stream",
				},
			})
		}
	},

	async replaceRunResultsAndSetFailed(params: {
		userId: string
		sessionId: string
		runId: string
		error: string
		partialResults: SessionResultUpsertInput[]
	}) {
		let session: SessionListItem | null = null
		let insertedResults: CandidateResultRow[] = []

		await db.transaction(async (tx) => {
			const [_, updatedSessions, inserted] = await Promise.all([
				tx.delete(schema.candidateResult).where(
					and(
						eq(schema.candidateResult.sessionId, params.sessionId),
						eq(schema.candidateResult.runId, params.runId),
					),
				),
				tx.update(schema.profilingSession)
					.set({ status: "failed", errorMessage: params.error, lastCompletedAt: null })
					.where(
						and(
							eq(schema.profilingSession.id, params.sessionId),
							eq(schema.profilingSession.activeRunId, params.runId),
						),
					)
					.returning(),
				params.partialResults.length > 0
					? tx.insert(schema.candidateResult).values(
						params.partialResults.map(result => ({
							sessionId: params.sessionId,
							runId: params.runId,
							fileId: result.file_id,
							candidateName: result.candidate_name,
							candidateEmail: result.candidate_email,
							candidatePhone: result.candidate_phone,
							rawText: result.raw_text,
							parsedProfile: result.parsed_profile,
							overallScore: String(result.overall_score),
							scoreBreakdown: result.score_breakdown,
							summary: result.summary,
							skillsMatched: result.skills_matched,
						})),
					).returning()
					: [],
			])

			session = updatedSessions[0] ?? null
			insertedResults = inserted
		})

		if (!session)
			return

		const files = await selectSessionFiles(params.sessionId)
		const fileMap = new Map(files.map(file => [file.fileId, file]))
		const summaries = insertedResults.map(result => ({
			id: result.id,
			runId: result.runId,
			fileId: result.fileId,
			candidateName: result.candidateName,
			candidateEmail: result.candidateEmail,
			candidatePhone: result.candidatePhone,
			parsedProfile: result.parsedProfile,
			overallScore: result.overallScore,
			summary: result.summary,
			skillsMatched: result.skillsMatched,
			createdAt: result.createdAt,
			originalName: fileMap.get(result.fileId)?.originalName ?? "Unknown file",
		}))

		patchSessionState({ session, files, results: summaries })

		for (const result of insertedResults) {
			const file = fileMap.get(result.fileId)
			repositoryCache.set(sessionRepositoryCacheKeys.result(params.userId, params.sessionId, result.id), {
				result: {
					id: result.id,
					runId: result.runId,
					sessionId: result.sessionId,
					fileId: result.fileId,
					candidateName: result.candidateName,
					candidateEmail: result.candidateEmail,
					candidatePhone: result.candidatePhone,
					rawText: result.rawText,
					parsedProfile: result.parsedProfile,
					overallScore: result.overallScore,
					scoreBreakdown: result.scoreBreakdown,
					summary: result.summary,
					skillsMatched: result.skillsMatched,
					createdAt: result.createdAt,
					originalName: file?.originalName ?? "Unknown file",
					mimeType: file?.mimeType ?? "application/octet-stream",
				},
			})
		}
	},
}
