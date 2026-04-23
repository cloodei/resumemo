import { and, asc, desc, eq } from "drizzle-orm"

import * as schema from "@resumemo/core/schemas"
import type {
	ScreeningJobDescriptionArtifact,
	ScreeningPipelineResult,
} from "@resumemo/core/schemas"

import { db } from "~/lib/db"

type SessionRow = typeof schema.screeningSession.$inferSelect

type UploadFile = {
	storageKey: string
	fileName: string
	mimeType: string
	size: number
}

type CreateSessionArgs = {
	userId: string
	name: string
	jobTitle: string | null
	runId: string
	files: UploadFile[]
	jobDescription: {
		id?: string
		name: string
		rawText: string
		source: "inline" | "template"
	}
}

function mapFileSize(value: bigint) {
	return Number(value)
}

function sessionSelectShape() {
	return {
		id: schema.screeningSession.id,
		userId: schema.screeningSession.userId,
		jobDescriptionId: schema.screeningSession.jobDescriptionId,
		name: schema.screeningSession.name,
		jobTitleSnapshot: schema.screeningSession.jobTitleSnapshot,
		status: schema.screeningSession.status,
		totalFiles: schema.screeningSession.totalFiles,
		activeRunId: schema.screeningSession.activeRunId,
		errorMessage: schema.screeningSession.errorMessage,
		jobDescriptionArtifact: schema.screeningSession.jobDescriptionArtifact,
		lastCompletedAt: schema.screeningSession.lastCompletedAt,
		createdAt: schema.screeningSession.createdAt,
		updatedAt: schema.screeningSession.updatedAt,
		jobDescriptionName: schema.screeningJobDescription.name,
		jobDescriptionTitle: schema.screeningJobDescription.jobTitle,
		jobDescriptionSource: schema.screeningJobDescription.source,
	}
}

export const screeningRepository = {
	async getOwnedJobDescription(userId: string, jobDescriptionId: string) {
		const [jobDescription] = await db.select()
			.from(schema.screeningJobDescription)
			.where(and(
				eq(schema.screeningJobDescription.id, jobDescriptionId),
				eq(schema.screeningJobDescription.userId, userId),
			))

		return jobDescription ?? null
	},

	async listJobDescriptions(userId: string) {
		return db.select({
			id: schema.screeningJobDescription.id,
			name: schema.screeningJobDescription.name,
			jobTitle: schema.screeningJobDescription.jobTitle,
			source: schema.screeningJobDescription.source,
			lastUsedAt: schema.screeningJobDescription.lastUsedAt,
			createdAt: schema.screeningJobDescription.createdAt,
			updatedAt: schema.screeningJobDescription.updatedAt,
		})
			.from(schema.screeningJobDescription)
			.where(eq(schema.screeningJobDescription.userId, userId))
			.orderBy(desc(schema.screeningJobDescription.lastUsedAt), desc(schema.screeningJobDescription.createdAt))
	},

	async createSession(args: CreateSessionArgs) {
		let session: SessionRow | undefined
		let jobDescription: typeof schema.screeningJobDescription.$inferSelect | undefined
		let files: Array<{
			fileId: number
			storageKey: string
			originalName: string
			mimeType: string
			size: bigint
		}> = []

		await db.transaction(async (tx) => {
			if (args.jobDescription.id) {
				const [existing] = await tx.select()
					.from(schema.screeningJobDescription)
					.where(eq(schema.screeningJobDescription.id, args.jobDescription.id))
				jobDescription = existing ?? null
			}
			else {
				[jobDescription] = await tx.insert(schema.screeningJobDescription)
					.values({
						userId: args.userId,
						name: args.jobDescription.name,
						jobTitle: args.jobTitle,
						rawText: args.jobDescription.rawText,
						source: args.jobDescription.source,
					})
					.returning()
			}

			if (!jobDescription)
				return

			[session, files] = await Promise.all([
				tx.insert(schema.screeningSession)
					.values({
						userId: args.userId,
						jobDescriptionId: jobDescription.id,
						name: args.name,
						jobTitleSnapshot: args.jobTitle,
						status: "processing",
						totalFiles: args.files.length,
						activeRunId: args.runId,
						errorMessage: null,
						jobDescriptionArtifact: null,
						lastCompletedAt: null,
					})
					.returning()
					.then(rows => rows[0] ?? null),
				tx.insert(schema.resumeFile)
					.values(args.files.map(file => ({
						userId: args.userId,
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

			if (!session)
				return

			await tx.insert(schema.screeningSessionFile).values(
				files.map(file => ({
					sessionId: session!.id,
					fileId: file.fileId,
				})),
			)

			await tx.update(schema.screeningJobDescription)
				.set({ lastUsedAt: new Date() })
				.where(eq(schema.screeningJobDescription.id, jobDescription.id))
		})

		if (!session || !jobDescription)
			return null

		return {
			session,
			jobDescription,
			files,
		}
	},

	async getOwnedSession(userId: string, sessionId: string) {
		const [session] = await db.select(sessionSelectShape())
			.from(schema.screeningSession)
			.innerJoin(
				schema.screeningJobDescription,
				eq(schema.screeningSession.jobDescriptionId, schema.screeningJobDescription.id),
			)
			.where(and(
				eq(schema.screeningSession.id, sessionId),
				eq(schema.screeningSession.userId, userId),
			))

		return session ?? null
	},

	async getSession(sessionId: string) {
		const [session] = await db.select()
			.from(schema.screeningSession)
			.where(eq(schema.screeningSession.id, sessionId))

		return session ?? null
	},

	async listSessions(userId: string) {
		return db.select(sessionSelectShape())
			.from(schema.screeningSession)
			.innerJoin(
				schema.screeningJobDescription,
				eq(schema.screeningSession.jobDescriptionId, schema.screeningJobDescription.id),
			)
			.where(eq(schema.screeningSession.userId, userId))
			.orderBy(desc(schema.screeningSession.createdAt))
	},

	async listSessionFiles(sessionId: string) {
		const rows = await db.select({
			fileId: schema.resumeFile.id,
			originalName: schema.resumeFile.originalName,
			storageKey: schema.resumeFile.storageKey,
			mimeType: schema.resumeFile.mimeType,
			size: schema.resumeFile.size,
		})
			.from(schema.screeningSessionFile)
			.innerJoin(schema.resumeFile, eq(schema.screeningSessionFile.fileId, schema.resumeFile.id))
			.where(eq(schema.screeningSessionFile.sessionId, sessionId))
			.orderBy(asc(schema.screeningSessionFile.createdAt))

		return rows.map(file => ({
			...file,
			size: mapFileSize(file.size),
		}))
	},

	async listSessionResults(sessionId: string, activeRunId: string | null, sort: "asc" | "desc") {
		const rows = await db.select({
			id: schema.screeningCandidate.id,
			runId: schema.screeningCandidate.runId,
			fileId: schema.screeningCandidate.fileId,
			candidateName: schema.screeningCandidate.candidateName,
			candidateEmail: schema.screeningCandidate.candidateEmail,
			candidatePhone: schema.screeningCandidate.candidatePhone,
			candidateProfile: schema.screeningCandidate.candidateProfile,
			overallScore: schema.screeningCandidate.overallScore,
			baseScore: schema.screeningCandidate.baseScore,
			bonusScore: schema.screeningCandidate.bonusScore,
			summary: schema.screeningCandidate.summary,
			skillsMatched: schema.screeningCandidate.skillsMatched,
			createdAt: schema.screeningCandidate.createdAt,
			originalName: schema.resumeFile.originalName,
		})
			.from(schema.screeningCandidate)
			.innerJoin(schema.resumeFile, eq(schema.screeningCandidate.fileId, schema.resumeFile.id))
			.where(eq(schema.screeningCandidate.sessionId, sessionId))
			.orderBy(sort === "asc"
				? asc(schema.screeningCandidate.overallScore)
				: desc(schema.screeningCandidate.overallScore))

		return activeRunId
			? rows.filter(result => result.runId === activeRunId)
			: rows
	},

	async getSessionResult(sessionId: string, resultId: string, activeRunId: string | null) {
		const [result] = await db.select({
			id: schema.screeningCandidate.id,
			runId: schema.screeningCandidate.runId,
			fileId: schema.screeningCandidate.fileId,
			candidateName: schema.screeningCandidate.candidateName,
			candidateEmail: schema.screeningCandidate.candidateEmail,
			candidatePhone: schema.screeningCandidate.candidatePhone,
			rawText: schema.screeningCandidate.rawText,
			resumeArtifact: schema.screeningCandidate.resumeArtifact,
			candidateProfile: schema.screeningCandidate.candidateProfile,
			scoreArtifact: schema.screeningCandidate.scoreArtifact,
			overallScore: schema.screeningCandidate.overallScore,
			baseScore: schema.screeningCandidate.baseScore,
			bonusScore: schema.screeningCandidate.bonusScore,
			summary: schema.screeningCandidate.summary,
			skillsMatched: schema.screeningCandidate.skillsMatched,
			createdAt: schema.screeningCandidate.createdAt,
			originalName: schema.resumeFile.originalName,
		})
			.from(schema.screeningCandidate)
			.innerJoin(schema.resumeFile, eq(schema.screeningCandidate.fileId, schema.resumeFile.id))
			.where(and(
				eq(schema.screeningCandidate.sessionId, sessionId),
				eq(schema.screeningCandidate.id, resultId),
			))

		if (!result)
			return null

		if (activeRunId && result.runId !== activeRunId)
			return null

		return result
	},

	async markSessionFailed(sessionId: string, message: string) {
		await db.update(schema.screeningSession)
			.set({
				status: "failed",
				errorMessage: message,
				lastCompletedAt: null,
			})
			.where(eq(schema.screeningSession.id, sessionId))
	},

	async applyPipelineUpdate(input: {
		sessionId: string
		runId: string
		status: "completed" | "failed"
		error?: string
		jobDescriptionArtifact: ScreeningJobDescriptionArtifact | null
		results: ScreeningPipelineResult[]
	}) {
		let applied = false

		await db.transaction(async (tx) => {
			const [currentSession] = await tx.select()
				.from(schema.screeningSession)
				.where(and(
					eq(schema.screeningSession.id, input.sessionId),
					eq(schema.screeningSession.activeRunId, input.runId),
				))

			if (!currentSession)
				return

			applied = true

			await tx.delete(schema.screeningCandidate).where(and(
				eq(schema.screeningCandidate.sessionId, input.sessionId),
				eq(schema.screeningCandidate.runId, input.runId),
			))

			if (input.jobDescriptionArtifact) {
				await tx.update(schema.screeningJobDescription)
					.set({
						latestArtifact: input.jobDescriptionArtifact,
						lastUsedAt: new Date(),
					})
					.where(eq(schema.screeningJobDescription.id, currentSession.jobDescriptionId))
			}

			await tx.update(schema.screeningSession)
				.set({
					status: input.status,
					errorMessage: input.error ?? null,
					jobDescriptionArtifact: input.jobDescriptionArtifact ?? currentSession.jobDescriptionArtifact,
					lastCompletedAt: input.status === "completed" ? new Date() : null,
				})
				.where(eq(schema.screeningSession.id, input.sessionId))

			if (input.results.length === 0)
				return

			await tx.insert(schema.screeningCandidate).values(
				input.results.map(result => ({
					sessionId: input.sessionId,
					fileId: result.file_id,
					runId: input.runId,
					candidateName: result.candidate_name,
					candidateEmail: result.candidate_email,
					candidatePhone: result.candidate_phone,
					rawText: result.raw_text,
					resumeArtifact: result.resume_artifact,
					candidateProfile: result.candidate_profile,
					scoreArtifact: result.score_artifact,
					overallScore: String(result.overall_score),
					baseScore: String(result.base_score),
					bonusScore: String(result.bonus_score),
					summary: result.summary,
					skillsMatched: result.skills_matched,
				})),
			)
		})

		return applied
	},
}
