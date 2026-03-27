import { and, asc, eq } from "drizzle-orm"

import * as schema from "@resumemo/core/schemas"

import { db } from "~/lib/db"
import { repositoryCache, sessionRepositoryCacheKeys, type CacheKey } from "~/lib/repository-cache"
import * as sessionQueries from "~/sql/session"
import {
	type SessionFileView,
	type SessionListItem,
	type SessionResultSummary,
	type SessionSort,
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

async function getCachedProjection<T>(key: CacheKey<T>, loader: () => Promise<T | null>) {
	const cached = repositoryCache.get(key)
	if (cached !== undefined)
		return cached

	const value = await loader()
	if (value !== null)
		repositoryCache.set(key, value)

	return value
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
	sessionId: string,
	activeRunId: string | null,
	results: SessionResultSummary[],
) {
	const n = results.length
	let ascResults: SessionResultSummary[] = new Array(n)
	let descResults: SessionResultSummary[] = new Array(n)

	for (let i = 0; i < n; i++) {
		const result = results[i]
		ascResults[i] = result
		repositoryCache.delete(sessionRepositoryCacheKeys.result(sessionId, result.id, activeRunId))
	}

	ascResults.sort((left, right) => Number(left.overallScore) - Number(right.overallScore))
	for (let i = 0; i < n; i++) {
		const result = ascResults[i]
		descResults[n - i - 1] = result
	}

	repositoryCache.set(sessionRepositoryCacheKeys.resultsData(sessionId, "asc", activeRunId), ascResults)
	repositoryCache.set(sessionRepositoryCacheKeys.resultsData(sessionId, "desc", activeRunId), descResults)
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
		current => patchSessionListEntry(current, payload.session, true),
	)

	setSessionResultsCaches(
		payload.session.id,
		payload.session.activeRunId,
		payload.results ?? [],
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
		current => patchSessionListEntry(current, payload.session),
	)

	setSessionResultsCaches(
		payload.session.id,
		payload.session.activeRunId,
		payload.results ?? [],
	)
}

async function getSessionFilesData(sessionId: string) {
	const cached = repositoryCache.get(sessionRepositoryCacheKeys.files(sessionId))
	if (cached !== undefined)
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

export const sessionRepository = {
	async getSessionById(sessionId: string) {
		return await getCachedProjection(sessionRepositoryCacheKeys.entity(sessionId), async () => {
			const [session] = await sessionQueries.selectSessionByIdStatement.execute({ sessionId })
			return session ?? null
		})
	},

	async getOwnedSessionById(userId: string, sessionId: string) {
		const cached = repositoryCache.get(sessionRepositoryCacheKeys.entity(sessionId))
		if (cached !== undefined)
			return cached.userId === userId ? cached : null

		const [session] = await sessionQueries.selectSessionByIdStatement.execute({ sessionId })
		if (!session)
			return null

		repositoryCache.set(sessionRepositoryCacheKeys.entity(sessionId), session)
		return session.userId === userId ? session : null
	},

	async listSessionFiles(sessionId: string) {
		return await getSessionFilesData(sessionId)
	},

	async listSessionsByUserId(userId: string) {
		const cached = await repositoryCache.getOrLoad(sessionRepositoryCacheKeys.list(userId), async () => {
			const sessions = await sessionQueries.selectSessionsByUserIdStatement.execute({ userId })
			for (const session of sessions)
				repositoryCache.set(sessionRepositoryCacheKeys.entity(session.id), session)

			return sessions
		})

		return cached ?? []
	},

	async listSessionResults(sessionId: string, sort: SessionSort, activeRunId: string | null) {
		return await getCachedProjection(sessionRepositoryCacheKeys.resultsData(sessionId, sort, activeRunId), async () => {
			const rows = sort === "asc"
				? await sessionQueries.selectSessionResultsByScoreAscStatement.execute({ sessionId })
				: await sessionQueries.selectSessionResultsByScoreDescStatement.execute({ sessionId })

			const results = activeRunId
				? rows.filter(result => result.runId === activeRunId)
				: rows

			return results
		})
	},

	async getSessionResultById(sessionId: string, resultId: string, activeRunId: string | null) {
		return await getCachedProjection(sessionRepositoryCacheKeys.result(sessionId, resultId, activeRunId), async () => {
			const rows = await sessionQueries.selectSessionResultByIdStatement.execute({ sessionId, resultId })
			const [result] = activeRunId
				? rows.filter(item => item.runId === activeRunId)
				: rows

			if (!result)
				return null

			return result
		})
	},

	async createSession(input: CreateSessionInput) {
		let sessionSnapshot: SessionListItem | undefined
		let createdFiles: SessionCreatedFileRecord[] = []

		try {
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
		}
		catch {
			return false
		}

		if (!sessionSnapshot)
			return false

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

		return {
			session: sessionSnapshot,
			files: createdFiles,
			totalConfirmed: createdFiles.length,
		}
	},

	async updateSessionFailure(sessionId: string, message: string) {
		const [session] = await sessionQueries.updateSessionFailureStatement.execute({
			sessionId,
			status: "failed",
			errorMessage: message,
			lastCompletedAt: null,
		})

		if (!session)
			return false

		patchSessionState({
			session,
			files: await getSessionFilesData(sessionId),
			results: [],
		})

		return true
	},

	async persistRetrySession(input: RetryMutationInput) {
		if (input.mode === "clone_current" || input.mode === "clone_with_updates") {
			let sessionSnapshot: SessionListItem | undefined

			try {
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
			}
			catch {
				return false
			}

			if (!sessionSnapshot)
				return false

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
			return false

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
		sessionId: string
		runId: string
		results: SessionResultUpsertInput[]
	}) {
		let session: SessionListItem | null = null
		let insertedResults: CandidateResultRow[] = []

		try {
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
								})),
							)
							.returning()
						: [],
				])

				session = updatedSessions[0] ?? null
				insertedResults = inserted
			})
		}
		catch {
			return false
		}

		if (!session)
			return false

		const files = await getSessionFilesData(params.sessionId)
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
			repositoryCache.set(sessionRepositoryCacheKeys.result(params.sessionId, result.id, params.runId), {
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
			})
		}

		return true
	},

	async replaceRunResultsAndSetFailed(params: {
		sessionId: string
		runId: string
		error: string
		partialResults: SessionResultUpsertInput[]
	}) {
		let session: SessionListItem | null = null
		let insertedResults: CandidateResultRow[] = []

		try {
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
						? tx.insert(schema.candidateResult)
							.values(
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
							)
							.returning()
						: [],
				])

				session = updatedSessions[0] ?? null
				insertedResults = inserted
			})
		}
		catch {
			return false
		}

		if (!session)
			return false

		const files = await getSessionFilesData(params.sessionId)
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
			repositoryCache.set(sessionRepositoryCacheKeys.result(params.sessionId, result.id, params.runId), {
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
			})
		}

		return true
	},
}
