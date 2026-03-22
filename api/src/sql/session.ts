import { and, desc, eq, sql } from "drizzle-orm"

import * as schema from "@resumemo/core/schemas"

import { db } from "~/lib/db"


export const listSessionsByUserStatement = db
  .select()
  .from(schema.profilingSession)
  .where(eq(schema.profilingSession.userId, sql.placeholder("userId")))
  .orderBy(desc(schema.profilingSession.createdAt))
  .prepare("session_list_by_user")

export const getOwnedSessionStatement = db
  .select()
  .from(schema.profilingSession)
  .where(
    and(
      eq(schema.profilingSession.id, sql.placeholder("sessionId")),
      eq(schema.profilingSession.userId, sql.placeholder("userId")),
    ),
  )
  .prepare("session_get_owned_base")

export const getSessionFilesStatement = db
  .select({
    id: schema.resumeFile.id,
    originalName: schema.resumeFile.originalName,
    mimeType: schema.resumeFile.mimeType,
    size: schema.resumeFile.size,
  })
  .from(schema.profilingSessionFile)
  .innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
  .where(eq(schema.profilingSessionFile.sessionId, sql.placeholder("sessionId")))
  .prepare("session_get_files_by_session_id")

export const getSessionResultsDescStatement = db
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
  .prepare("session_get_results_desc")

export const getSessionResultsAscStatement = db
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
  .prepare("session_get_results_asc")

export const getSessionResultDetailStatement = db
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
  .prepare("session_get_result_detail")

export const getRetrySessionStatement = db
  .select({
    id: schema.profilingSession.id,
    userId: schema.profilingSession.userId,
    name: schema.profilingSession.name,
    jobTitle: schema.profilingSession.jobTitle,
    jobDescription: schema.profilingSession.jobDescription,
    status: schema.profilingSession.status,
  })
  .from(schema.profilingSession)
  .where(
    and(
      eq(schema.profilingSession.id, sql.placeholder("sessionId")),
      eq(schema.profilingSession.userId, sql.placeholder("userId")),
    ),
  )
  .prepare("session_get_retry_preview")

export const getRetryFilesStatement = db
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
  .prepare("session_get_retry_files")

export const markSessionFailedStatement = db
  .update(schema.profilingSession)
  .set({
    status: schema.profilingSession.status,
    errorMessage: schema.profilingSession.errorMessage,
    lastCompletedAt: schema.profilingSession.lastCompletedAt,
  })
  .where(eq(schema.profilingSession.id, sql.placeholder("sessionId")))
  .returning()
  .prepare("session_mark_failed");

export const updateSessionRetryingStatement = db
  .update(schema.profilingSession)
  .set({
    name: schema.profilingSession.name,
    jobTitle: schema.profilingSession.jobTitle,
    jobDescription: schema.profilingSession.jobDescription,
    status: schema.profilingSession.status,
    activeRunId: schema.profilingSession.activeRunId,
    errorMessage: schema.profilingSession.errorMessage,
    lastCompletedAt: schema.profilingSession.lastCompletedAt,
    totalFiles: schema.profilingSession.totalFiles,
  })
  .where(eq(schema.profilingSession.id, sql.placeholder("sessionId")))
  .returning()
  .prepare("session_update_retrying");
