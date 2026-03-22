import * as sessionQueries from "~/sql/session"

export type SessionSort = "asc" | "desc"

export type SessionListItem = Awaited<ReturnType<typeof sessionQueries.listSessionsByUserStatement.execute>>[number]
export type ProfilingSession = Awaited<ReturnType<typeof sessionQueries.getOwnedSessionStatement.execute>>[number]
export type SessionResultSummary = Awaited<ReturnType<typeof sessionQueries.getSessionResultsDescStatement.execute>>[number]
export type SessionResultDetail = Awaited<ReturnType<typeof sessionQueries.getSessionResultDetailStatement.execute>>[number]
export type RetrySession = Awaited<ReturnType<typeof sessionQueries.getRetrySessionStatement.execute>>[number]
export type RetryFile = Awaited<ReturnType<typeof sessionQueries.getRetryFilesStatement.execute>>[number]
export type SessionFileRow = Awaited<ReturnType<typeof sessionQueries.getSessionFilesStatement.execute>>[number]
export type SessionFileView = Omit<SessionFileRow, "size"> & { size: number }
