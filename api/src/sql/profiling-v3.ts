import { and, desc, eq, sql } from "drizzle-orm"

import { db } from "~/lib/db"
import * as schema from "@resumemo/core/schemas"

export const selectJobDescriptionTemplatesV3ByUserIdStatement = db
	.select()
	.from(schema.profilingJobDescriptionV3)
	.where(eq(schema.profilingJobDescriptionV3.userId, sql.placeholder("userId")))
	.orderBy(desc(schema.profilingJobDescriptionV3.updatedAt))
	.prepare("profiling_v3_job_description_select_by_user_id")

export const selectJobDescriptionTemplateV3ByIdStatement = db
	.select()
	.from(schema.profilingJobDescriptionV3)
	.where(eq(schema.profilingJobDescriptionV3.id, sql.placeholder("jobDescriptionId")))
	.prepare("profiling_v3_job_description_select_by_id")

export const selectProfilingSessionsV3ByUserIdStatement = db
	.select({
		id: schema.profilingSessionV3.id,
		userId: schema.profilingSessionV3.userId,
		jobDescriptionId: schema.profilingSessionV3.jobDescriptionId,
		jobDescriptionName: schema.profilingJobDescriptionV3.name,
		jobDescriptionSource: schema.profilingJobDescriptionV3.source,
		name: schema.profilingSessionV3.name,
		jobTitleSnapshot: schema.profilingSessionV3.jobTitleSnapshot,
		status: schema.profilingSessionV3.status,
		totalFiles: schema.profilingSessionV3.totalFiles,
		activeRunId: schema.profilingSessionV3.activeRunId,
		errorMessage: schema.profilingSessionV3.errorMessage,
		jobDescriptionArtifact: schema.profilingSessionV3.jobDescriptionArtifact,
		lastCompletedAt: schema.profilingSessionV3.lastCompletedAt,
		createdAt: schema.profilingSessionV3.createdAt,
		updatedAt: schema.profilingSessionV3.updatedAt,
	})
	.from(schema.profilingSessionV3)
	.innerJoin(
		schema.profilingJobDescriptionV3,
		eq(schema.profilingSessionV3.jobDescriptionId, schema.profilingJobDescriptionV3.id),
	)
	.where(eq(schema.profilingSessionV3.userId, sql.placeholder("userId")))
	.orderBy(desc(schema.profilingSessionV3.createdAt))
	.prepare("profiling_v3_session_select_by_user_id")

export const selectProfilingSessionV3ByIdStatement = db
	.select({
		id: schema.profilingSessionV3.id,
		userId: schema.profilingSessionV3.userId,
		jobDescriptionId: schema.profilingSessionV3.jobDescriptionId,
		jobDescriptionName: schema.profilingJobDescriptionV3.name,
		jobDescriptionSource: schema.profilingJobDescriptionV3.source,
		jobDescriptionText: schema.profilingJobDescriptionV3.rawText,
		name: schema.profilingSessionV3.name,
		jobTitleSnapshot: schema.profilingSessionV3.jobTitleSnapshot,
		status: schema.profilingSessionV3.status,
		totalFiles: schema.profilingSessionV3.totalFiles,
		activeRunId: schema.profilingSessionV3.activeRunId,
		errorMessage: schema.profilingSessionV3.errorMessage,
		jobDescriptionArtifact: schema.profilingSessionV3.jobDescriptionArtifact,
		lastCompletedAt: schema.profilingSessionV3.lastCompletedAt,
		createdAt: schema.profilingSessionV3.createdAt,
		updatedAt: schema.profilingSessionV3.updatedAt,
	})
	.from(schema.profilingSessionV3)
	.innerJoin(
		schema.profilingJobDescriptionV3,
		eq(schema.profilingSessionV3.jobDescriptionId, schema.profilingJobDescriptionV3.id),
	)
	.where(eq(schema.profilingSessionV3.id, sql.placeholder("sessionId")))
	.prepare("profiling_v3_session_select_by_id")

export const selectProfilingSessionV3FilesStatement = db
	.select({
		fileId: schema.resumeFile.id,
		storageKey: schema.resumeFile.storageKey,
		originalName: schema.resumeFile.originalName,
		mimeType: schema.resumeFile.mimeType,
		size: schema.resumeFile.size,
	})
	.from(schema.profilingSessionFileV3)
	.innerJoin(schema.resumeFile, eq(schema.profilingSessionFileV3.fileId, schema.resumeFile.id))
	.where(eq(schema.profilingSessionFileV3.sessionId, sql.placeholder("sessionId")))
	.prepare("profiling_v3_session_select_files")

export const selectProfilingSessionV3ResultsByScoreDescStatement = db
	.select({
		id: schema.candidateResultV3.id,
		runId: schema.candidateResultV3.runId,
		fileId: schema.candidateResultV3.fileId,
		candidateName: schema.candidateResultV3.candidateName,
		candidateEmail: schema.candidateResultV3.candidateEmail,
		candidatePhone: schema.candidateResultV3.candidatePhone,
		candidateDna: schema.candidateResultV3.candidateDna,
		overallScore: schema.candidateResultV3.overallScore,
		baseScore: schema.candidateResultV3.baseScore,
		bonusScore: schema.candidateResultV3.bonusScore,
		summary: schema.candidateResultV3.summary,
		skillsMatched: schema.candidateResultV3.skillsMatched,
		createdAt: schema.candidateResultV3.createdAt,
		originalName: schema.resumeFile.originalName,
	})
	.from(schema.candidateResultV3)
	.innerJoin(schema.resumeFile, eq(schema.candidateResultV3.fileId, schema.resumeFile.id))
	.where(eq(schema.candidateResultV3.sessionId, sql.placeholder("sessionId")))
	.orderBy(desc(schema.candidateResultV3.overallScore))
	.prepare("profiling_v3_session_results_by_score_desc")

export const selectProfilingSessionV3ResultsByScoreAscStatement = db
	.select({
		id: schema.candidateResultV3.id,
		runId: schema.candidateResultV3.runId,
		fileId: schema.candidateResultV3.fileId,
		candidateName: schema.candidateResultV3.candidateName,
		candidateEmail: schema.candidateResultV3.candidateEmail,
		candidatePhone: schema.candidateResultV3.candidatePhone,
		candidateDna: schema.candidateResultV3.candidateDna,
		overallScore: schema.candidateResultV3.overallScore,
		baseScore: schema.candidateResultV3.baseScore,
		bonusScore: schema.candidateResultV3.bonusScore,
		summary: schema.candidateResultV3.summary,
		skillsMatched: schema.candidateResultV3.skillsMatched,
		createdAt: schema.candidateResultV3.createdAt,
		originalName: schema.resumeFile.originalName,
	})
	.from(schema.candidateResultV3)
	.innerJoin(schema.resumeFile, eq(schema.candidateResultV3.fileId, schema.resumeFile.id))
	.where(eq(schema.candidateResultV3.sessionId, sql.placeholder("sessionId")))
	.orderBy(schema.candidateResultV3.overallScore)
	.prepare("profiling_v3_session_results_by_score_asc")

export const selectProfilingSessionV3ResultByIdStatement = db
	.select({
		id: schema.candidateResultV3.id,
		runId: schema.candidateResultV3.runId,
		sessionId: schema.candidateResultV3.sessionId,
		fileId: schema.candidateResultV3.fileId,
		candidateName: schema.candidateResultV3.candidateName,
		candidateEmail: schema.candidateResultV3.candidateEmail,
		candidatePhone: schema.candidateResultV3.candidatePhone,
		rawText: schema.candidateResultV3.rawText,
		resumeArtifact: schema.candidateResultV3.resumeArtifact,
		candidateDna: schema.candidateResultV3.candidateDna,
		scoreArtifact: schema.candidateResultV3.scoreArtifact,
		overallScore: schema.candidateResultV3.overallScore,
		baseScore: schema.candidateResultV3.baseScore,
		bonusScore: schema.candidateResultV3.bonusScore,
		summary: schema.candidateResultV3.summary,
		skillsMatched: schema.candidateResultV3.skillsMatched,
		createdAt: schema.candidateResultV3.createdAt,
		originalName: schema.resumeFile.originalName,
		mimeType: schema.resumeFile.mimeType,
	})
	.from(schema.candidateResultV3)
	.innerJoin(schema.resumeFile, eq(schema.candidateResultV3.fileId, schema.resumeFile.id))
	.where(
		and(
			eq(schema.candidateResultV3.id, sql.placeholder("resultId")),
			eq(schema.candidateResultV3.sessionId, sql.placeholder("sessionId")),
		),
	)
	.prepare("profiling_v3_session_result_by_id")
