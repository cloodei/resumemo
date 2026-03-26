import { and, desc, eq, sql } from "drizzle-orm"

import * as schema from "@resumemo/core/schemas"

import { db } from "~/lib/db"


export const selectSessionsByUserIdStatement = db
  .select()
  .from(schema.profilingSession)
  .where(eq(schema.profilingSession.userId, sql.placeholder("userId")))
  .orderBy(desc(schema.profilingSession.createdAt))
  .prepare("session_select_by_user_id")

export const selectSessionByIdStatement = db
  .select()
  .from(schema.profilingSession)
  .where(eq(schema.profilingSession.id, sql.placeholder("sessionId")))
  .prepare("session_select_by_id")

// export const selectOwnedSessionStatement = db
//   .select()
//   .from(schema.profilingSession)
//   .where(
//     and(
//       eq(schema.profilingSession.id, sql.placeholder("sessionId")),
//       eq(schema.profilingSession.userId, sql.placeholder("userId")),
//     ),
//   )
//   .prepare("session_select_owned")

// export const selectSessionFilesStatement = db
//   .select({
//     id: schema.resumeFile.id,
//     originalName: schema.resumeFile.originalName,
//     mimeType: schema.resumeFile.mimeType,
//     size: schema.resumeFile.size,
//   })
//   .from(schema.profilingSessionFile)
//   .innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
//   .where(eq(schema.profilingSessionFile.sessionId, sql.placeholder("sessionId")))
//   .prepare("session_select_files")

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

// export const selectOwnedSessionRetryRowStatement = db
//   .select({
//     id: schema.profilingSession.id,
//     userId: schema.profilingSession.userId,
//     name: schema.profilingSession.name,
//     jobTitle: schema.profilingSession.jobTitle,
//     jobDescription: schema.profilingSession.jobDescription,
//     status: schema.profilingSession.status,
//   })
//   .from(schema.profilingSession)
//   .where(
//     and(
//       eq(schema.profilingSession.id, sql.placeholder("sessionId")),
//       eq(schema.profilingSession.userId, sql.placeholder("userId")),
//     ),
//   )
//   .prepare("session_select_owned_retry_row")

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

export const updateSessionFailureStatement = db
  .update(schema.profilingSession)
  .set({
    status: schema.profilingSession.status,
    errorMessage: schema.profilingSession.errorMessage,
    lastCompletedAt: schema.profilingSession.lastCompletedAt,
  })
  .where(eq(schema.profilingSession.id, sql.placeholder("sessionId")))
  .returning()
  .prepare("session_update_failure")

export const updateSessionRetryStateStatement = db
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
  .prepare("session_update_retry_state")
