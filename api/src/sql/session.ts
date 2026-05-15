import { and, desc, eq, sql } from "drizzle-orm"

import { db } from "~/lib/db"
import * as schema from "@resumemo/core/schemas"


export const selectSessionsByUserIdStatement = db
  .select({
    id: schema.profilingSession.id,
    userId: schema.profilingSession.userId,
    jobDescriptionTemplateId: schema.profilingSession.jobDescriptionTemplateId,
    name: schema.profilingSession.name,
    jobDescription: schema.jobDescriptionTemplate.rawText,
    jobTitle: schema.profilingSession.jobTitle,
    status: schema.profilingSession.status,
    totalFiles: schema.profilingSession.totalFiles,
    activeRunId: schema.profilingSession.activeRunId,
    errorMessage: schema.profilingSession.errorMessage,
    lastCompletedAt: schema.profilingSession.lastCompletedAt,
    createdAt: schema.profilingSession.createdAt,
    updatedAt: schema.profilingSession.updatedAt,
  })
  .from(schema.profilingSession)
  .innerJoin(schema.jobDescriptionTemplate, eq(schema.profilingSession.jobDescriptionTemplateId, schema.jobDescriptionTemplate.id))
  .where(eq(schema.profilingSession.userId, sql.placeholder("userId")))
  .orderBy(desc(schema.profilingSession.createdAt))
  .prepare("session_select_by_user_id")

export const selectSessionByIdStatement = db
  .select({
    id: schema.profilingSession.id,
    userId: schema.profilingSession.userId,
    jobDescriptionTemplateId: schema.profilingSession.jobDescriptionTemplateId,
    name: schema.profilingSession.name,
    jobDescription: schema.jobDescriptionTemplate.rawText,
    jobTitle: schema.profilingSession.jobTitle,
    status: schema.profilingSession.status,
    totalFiles: schema.profilingSession.totalFiles,
    activeRunId: schema.profilingSession.activeRunId,
    errorMessage: schema.profilingSession.errorMessage,
    lastCompletedAt: schema.profilingSession.lastCompletedAt,
    createdAt: schema.profilingSession.createdAt,
    updatedAt: schema.profilingSession.updatedAt,
  })
  .from(schema.profilingSession)
  .innerJoin(schema.jobDescriptionTemplate, eq(schema.profilingSession.jobDescriptionTemplateId, schema.jobDescriptionTemplate.id))
  .where(eq(schema.profilingSession.id, sql.placeholder("sessionId")))
  .prepare("session_select_by_id")

export const selectJobDescriptionTemplatesByUserIdStatement = db
  .select({
    id: schema.jobDescriptionTemplate.id,
    userId: schema.jobDescriptionTemplate.userId,
    name: schema.jobDescriptionTemplate.name,
    jobTitle: schema.jobDescriptionTemplate.jobTitle,
    rawText: schema.jobDescriptionTemplate.rawText,
    contentHash: schema.jobDescriptionTemplate.contentHash,
    useCount: schema.jobDescriptionTemplate.useCount,
    lastUsedAt: schema.jobDescriptionTemplate.lastUsedAt,
    createdAt: schema.jobDescriptionTemplate.createdAt,
    updatedAt: schema.jobDescriptionTemplate.updatedAt,
  })
  .from(schema.jobDescriptionTemplate)
  .where(eq(schema.jobDescriptionTemplate.userId, sql.placeholder("userId")))
  .orderBy(desc(schema.jobDescriptionTemplate.useCount), desc(schema.jobDescriptionTemplate.lastUsedAt))
  .prepare("job_description_templates_select_by_user_id")

export const selectSessionResultsByScoreDescStatement = db
  .select({
    id: schema.candidateResult.id,
    runId: schema.candidateResult.runId,
    fileId: schema.candidateResult.fileId,
    candidateName: schema.candidateResult.candidateName,
    candidateEmail: schema.candidateResult.candidateEmail,
    candidatePhone: schema.candidateResult.candidatePhone,
    parsedProfile: schema.candidateResult.parsedProfile,
    overallScore: schema.candidateResult.overallScore,
    summary: schema.candidateResult.summary,
    skillsMatched: schema.candidateResult.skillsMatched,
    createdAt: schema.candidateResult.createdAt,
    originalName: schema.resumeFile.originalName,
  })
  .from(schema.candidateResult)
  .innerJoin(schema.resumeFile, eq(schema.candidateResult.fileId, schema.resumeFile.id))
  .where(eq(schema.candidateResult.sessionId, sql.placeholder("sessionId")))
  .orderBy(desc(schema.candidateResult.overallScore))
  .prepare("session_select_results_by_score_desc")

export const selectSessionResultsByScoreAscStatement = db
  .select({
    id: schema.candidateResult.id,
    runId: schema.candidateResult.runId,
    fileId: schema.candidateResult.fileId,
    candidateName: schema.candidateResult.candidateName,
    candidateEmail: schema.candidateResult.candidateEmail,
    candidatePhone: schema.candidateResult.candidatePhone,
    parsedProfile: schema.candidateResult.parsedProfile,
    overallScore: schema.candidateResult.overallScore,
    summary: schema.candidateResult.summary,
    skillsMatched: schema.candidateResult.skillsMatched,
    createdAt: schema.candidateResult.createdAt,
    originalName: schema.resumeFile.originalName,
  })
  .from(schema.candidateResult)
  .innerJoin(schema.resumeFile, eq(schema.candidateResult.fileId, schema.resumeFile.id))
  .where(eq(schema.candidateResult.sessionId, sql.placeholder("sessionId")))
  .orderBy(schema.candidateResult.overallScore)
  .prepare("session_select_results_by_score_asc")

export const selectSessionResultByIdStatement = db
  .select({
    id: schema.candidateResult.id,
    runId: schema.candidateResult.runId,
    sessionId: schema.candidateResult.sessionId,
    fileId: schema.candidateResult.fileId,
    candidateName: schema.candidateResult.candidateName,
    candidateEmail: schema.candidateResult.candidateEmail,
    candidatePhone: schema.candidateResult.candidatePhone,
    rawText: schema.candidateResult.rawText,
    parsedProfile: schema.candidateResult.parsedProfile,
    overallScore: schema.candidateResult.overallScore,
    scoreBreakdown: schema.candidateResult.scoreBreakdown,
    summary: schema.candidateResult.summary,
    skillsMatched: schema.candidateResult.skillsMatched,
    createdAt: schema.candidateResult.createdAt,
    originalName: schema.resumeFile.originalName,
    mimeType: schema.resumeFile.mimeType,
  })
  .from(schema.candidateResult)
  .innerJoin(schema.resumeFile, eq(schema.candidateResult.fileId, schema.resumeFile.id))
  .where(
    and(
      eq(schema.candidateResult.id, sql.placeholder("resultId")),
      eq(schema.candidateResult.sessionId, sql.placeholder("sessionId")),
    ),
  )
  .prepare("session_select_result_by_id")

export const selectSessionFilesStatement = db
  .select({
    fileId: schema.resumeFile.id,
    storageKey: schema.resumeFile.storageKey,
    originalName: schema.resumeFile.originalName,
    mimeType: schema.resumeFile.mimeType,
    size: schema.resumeFile.size,
  })
  .from(schema.profilingSessionFile)
  .innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
  .where(eq(schema.profilingSessionFile.sessionId, sql.placeholder("sessionId")))
  .prepare("session_select_files")
