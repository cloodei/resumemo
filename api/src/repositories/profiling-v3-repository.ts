import { and, eq } from "drizzle-orm"

import * as schema from "@resumemo/core/schemas"
import type {
	ProfilingV3CandidateDna,
	ProfilingV3JobDescriptionArtifact,
	ProfilingV3ResumeArtifact,
	ProfilingV3ScoreArtifact,
} from "@resumemo/core/schemas"

import { db } from "~/lib/db"
import * as profilingV3Queries from "~/sql/profiling-v3"
import type {
	ProfilingV3SessionListItem,
	ProfilingV3SessionSort,
} from "~/types"

type CandidateResultV3Row = typeof schema.candidateResultV3.$inferSelect

export type ProfilingV3CreateInputFile = {
	storageKey: string
	fileName: string
	mimeType: string
	size: number
}

export type ProfilingV3CreatedFileRecord = {
	fileId: number
	storageKey: string
	originalName: string
	mimeType: string
	size: bigint
}

export type CreateJobDescriptionV3Input = {
	userId: string
	name: string
	jobTitle: string | null
	rawText: string
	source: "inline" | "template"
}

export type CreateSessionV3Input = {
	userId: string
	name: string
	jobDescriptionId: string
	jobTitleSnapshot: string | null
	runId: string
	files: ProfilingV3CreateInputFile[]
}

export type ProfilingV3ResultUpsertInput = {
	file_id: number
	candidate_name: string | null
	candidate_email: string | null
	candidate_phone: string | null
	raw_text: string
	resume_artifact: ProfilingV3ResumeArtifact | null
	candidate_dna: ProfilingV3CandidateDna
	score_artifact: ProfilingV3ScoreArtifact
	overall_score: number
	base_score: number
	bonus_score: number
	summary: string
	skills_matched: string[]
}

async function getSessionFilesData(sessionId: string) {
	const rows = await profilingV3Queries.selectProfilingSessionV3FilesStatement.execute({ sessionId })
	return rows.map(file => ({
		fileId: file.fileId,
		storageKey: file.storageKey,
		originalName: file.originalName,
		mimeType: file.mimeType,
		size: Number(file.size),
	}))
}

export const profilingV3Repository = {
	async createJobDescription(input: CreateJobDescriptionV3Input) {
		const [created] = await db.insert(schema.profilingJobDescriptionV3)
			.values({
				userId: input.userId,
				name: input.name,
				jobTitle: input.jobTitle,
				rawText: input.rawText,
				source: input.source,
			})
			.returning()

		return created ?? null
	},

	async getOwnedJobDescriptionById(userId: string, jobDescriptionId: string) {
		const [jobDescription] = await profilingV3Queries.selectJobDescriptionTemplateV3ByIdStatement.execute({ jobDescriptionId })
		if (!jobDescription || jobDescription.userId !== userId)
			return null

		return jobDescription
	},

	async listJobDescriptionsByUserId(userId: string) {
		return await profilingV3Queries.selectJobDescriptionTemplatesV3ByUserIdStatement.execute({ userId })
	},

	async getSessionById(sessionId: string) {
		const [session] = await profilingV3Queries.selectProfilingSessionV3ByIdStatement.execute({ sessionId })
		return session ?? null
	},

	async getOwnedSessionById(userId: string, sessionId: string) {
		const [session] = await profilingV3Queries.selectProfilingSessionV3ByIdStatement.execute({ sessionId })
		if (!session || session.userId !== userId)
			return null

		return session
	},

	async listSessionsByUserId(userId: string) {
		return await profilingV3Queries.selectProfilingSessionsV3ByUserIdStatement.execute({ userId })
	},

	async listSessionFiles(sessionId: string) {
		return await getSessionFilesData(sessionId)
	},

	async listSessionResults(sessionId: string, sort: ProfilingV3SessionSort, activeRunId: string | null) {
		const rows = sort === "asc"
			? await profilingV3Queries.selectProfilingSessionV3ResultsByScoreAscStatement.execute({ sessionId })
			: await profilingV3Queries.selectProfilingSessionV3ResultsByScoreDescStatement.execute({ sessionId })

		return activeRunId
			? rows.filter(result => result.runId === activeRunId)
			: rows
	},

	async getSessionResultById(sessionId: string, resultId: string, activeRunId: string | null) {
		const rows = await profilingV3Queries.selectProfilingSessionV3ResultByIdStatement.execute({ sessionId, resultId })
		const [result] = activeRunId
			? rows.filter(item => item.runId === activeRunId)
			: rows

		return result ?? null
	},

	async createSession(input: CreateSessionV3Input) {
		let createdSessionId: string | null = null
		let sessionSnapshot: ProfilingV3SessionListItem | undefined
		let createdFiles: ProfilingV3CreatedFileRecord[] = []

		try {
			await db.transaction(async (tx) => {
				const [[createdSession], created] = await Promise.all([
					tx.insert(schema.profilingSessionV3)
						.values({
							userId: input.userId,
							jobDescriptionId: input.jobDescriptionId,
							name: input.name,
							jobTitleSnapshot: input.jobTitleSnapshot,
							status: "processing",
							activeRunId: input.runId,
							totalFiles: input.files.length,
							errorMessage: null,
							lastCompletedAt: null,
							jobDescriptionArtifact: null,
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
				createdSessionId = createdSession.id
				await tx.insert(schema.profilingSessionFileV3).values(
					createdFiles.map(file => ({
						sessionId: createdSession.id,
						fileId: file.fileId,
					})),
				)
			})
		}
		catch {
			return false
		}

		if (createdSessionId) {
			const [session] = await profilingV3Queries.selectProfilingSessionV3ByIdStatement.execute({ sessionId: createdSessionId })
			sessionSnapshot = session
		}

		if (!sessionSnapshot)
			return false

		return {
			session: sessionSnapshot,
			files: createdFiles,
		}
	},

	async touchJobDescription(jobDescriptionId: string, artifact: ProfilingV3JobDescriptionArtifact | null) {
		await db.update(schema.profilingJobDescriptionV3)
			.set({
				lastUsedAt: new Date(),
				latestArtifact: artifact,
			})
			.where(eq(schema.profilingJobDescriptionV3.id, jobDescriptionId))
	},

	async updateSessionFailure(sessionId: string, message: string) {
		const [session] = await db.update(schema.profilingSessionV3)
			.set({
				status: "failed",
				errorMessage: message,
				lastCompletedAt: null,
			})
			.where(eq(schema.profilingSessionV3.id, sessionId))
			.returning()

		return session ?? false
	},

	async replaceRunResultsAndSetCompleted(params: {
		sessionId: string
		runId: string
		jobDescriptionArtifact: ProfilingV3JobDescriptionArtifact
		results: ProfilingV3ResultUpsertInput[]
	}) {
		let session: ProfilingV3SessionListItem | null = null
		let insertedResults: CandidateResultV3Row[] = []

		try {
			await db.transaction(async (tx) => {
				const [currentSession] = await tx.select()
					.from(schema.profilingSessionV3)
					.where(
						and(
							eq(schema.profilingSessionV3.id, params.sessionId),
							eq(schema.profilingSessionV3.activeRunId, params.runId),
						),
					)

				if (!currentSession)
					return

				await tx.delete(schema.candidateResultV3).where(
					and(
						eq(schema.candidateResultV3.sessionId, params.sessionId),
						eq(schema.candidateResultV3.runId, params.runId),
					),
				)

				await tx.update(schema.profilingJobDescriptionV3)
					.set({
						latestArtifact: params.jobDescriptionArtifact,
						lastUsedAt: new Date(),
					})
					.where(eq(schema.profilingJobDescriptionV3.id, currentSession.jobDescriptionId))

				await tx.update(schema.profilingSessionV3)
					.set({
						status: "completed",
						errorMessage: null,
						lastCompletedAt: new Date(),
						jobDescriptionArtifact: params.jobDescriptionArtifact,
					})
					.where(eq(schema.profilingSessionV3.id, params.sessionId))

				insertedResults = params.results.length > 0
					? await tx.insert(schema.candidateResultV3)
						.values(params.results.map(result => ({
							sessionId: params.sessionId,
							runId: params.runId,
							fileId: result.file_id,
							candidateName: result.candidate_name,
							candidateEmail: result.candidate_email,
							candidatePhone: result.candidate_phone,
							rawText: result.raw_text,
							resumeArtifact: result.resume_artifact,
							candidateDna: result.candidate_dna,
							scoreArtifact: result.score_artifact,
							overallScore: String(result.overall_score),
							baseScore: String(result.base_score),
							bonusScore: String(result.bonus_score),
							summary: result.summary,
							skillsMatched: result.skills_matched,
						})))
						.returning()
					: []
			})
		}
		catch {
			return false
		}

		const [selectedSession] = await profilingV3Queries.selectProfilingSessionV3ByIdStatement.execute({ sessionId: params.sessionId })
		session = selectedSession ?? null

		if (!session)
			return false

		const files = await getSessionFilesData(params.sessionId)
		const fileMap = new Map(files.map(file => [file.fileId, file]))

		return {
			session,
			files,
			results: insertedResults.map(result => ({
				id: result.id,
				runId: result.runId,
				fileId: result.fileId,
				candidateName: result.candidateName,
				candidateEmail: result.candidateEmail,
				candidatePhone: result.candidatePhone,
				candidateDna: result.candidateDna,
				overallScore: result.overallScore,
				baseScore: result.baseScore,
				bonusScore: result.bonusScore,
				summary: result.summary,
				skillsMatched: result.skillsMatched,
				createdAt: result.createdAt,
				originalName: fileMap.get(result.fileId)?.originalName ?? "Unknown file",
			})),
		}
	},

	async replaceRunResultsAndSetFailed(params: {
		sessionId: string
		runId: string
		error: string
		jobDescriptionArtifact?: ProfilingV3JobDescriptionArtifact | null
		partialResults: ProfilingV3ResultUpsertInput[]
	}) {
		let session: ProfilingV3SessionListItem | null = null
		let insertedResults: CandidateResultV3Row[] = []

		try {
			await db.transaction(async (tx) => {
				const [currentSession] = await tx.select()
					.from(schema.profilingSessionV3)
					.where(
						and(
							eq(schema.profilingSessionV3.id, params.sessionId),
							eq(schema.profilingSessionV3.activeRunId, params.runId),
						),
					)

				if (!currentSession)
					return

				await tx.delete(schema.candidateResultV3).where(
					and(
						eq(schema.candidateResultV3.sessionId, params.sessionId),
						eq(schema.candidateResultV3.runId, params.runId),
					),
				)

				if (params.jobDescriptionArtifact) {
					await tx.update(schema.profilingJobDescriptionV3)
						.set({
							latestArtifact: params.jobDescriptionArtifact,
							lastUsedAt: new Date(),
						})
						.where(eq(schema.profilingJobDescriptionV3.id, currentSession.jobDescriptionId))
				}

				await tx.update(schema.profilingSessionV3)
					.set({
						status: "failed",
						errorMessage: params.error,
						lastCompletedAt: null,
						jobDescriptionArtifact: params.jobDescriptionArtifact ?? currentSession.jobDescriptionArtifact,
					})
					.where(eq(schema.profilingSessionV3.id, params.sessionId))

				insertedResults = params.partialResults.length > 0
					? await tx.insert(schema.candidateResultV3)
						.values(params.partialResults.map(result => ({
							sessionId: params.sessionId,
							runId: params.runId,
							fileId: result.file_id,
							candidateName: result.candidate_name,
							candidateEmail: result.candidate_email,
							candidatePhone: result.candidate_phone,
							rawText: result.raw_text,
							resumeArtifact: result.resume_artifact,
							candidateDna: result.candidate_dna,
							scoreArtifact: result.score_artifact,
							overallScore: String(result.overall_score),
							baseScore: String(result.base_score),
							bonusScore: String(result.bonus_score),
							summary: result.summary,
							skillsMatched: result.skills_matched,
						})))
						.returning()
					: []
			})
		}
		catch {
			return false
		}

		const [selectedSession] = await profilingV3Queries.selectProfilingSessionV3ByIdStatement.execute({ sessionId: params.sessionId })
		session = selectedSession ?? null

		if (!session)
			return false

		const files = await getSessionFilesData(params.sessionId)
		const fileMap = new Map(files.map(file => [file.fileId, file]))

		return {
			session,
			files,
			results: insertedResults.map(result => ({
				id: result.id,
				runId: result.runId,
				fileId: result.fileId,
				candidateName: result.candidateName,
				candidateEmail: result.candidateEmail,
				candidatePhone: result.candidatePhone,
				candidateDna: result.candidateDna,
				overallScore: result.overallScore,
				baseScore: result.baseScore,
				bonusScore: result.bonusScore,
				summary: result.summary,
				skillsMatched: result.skillsMatched,
				createdAt: result.createdAt,
				originalName: fileMap.get(result.fileId)?.originalName ?? "Unknown file",
			})),
		}
	},
}
