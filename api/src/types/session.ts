import * as sessionQueries from "~/sql/session"

export type SessionSort = "asc" | "desc"

export type SessionListItem = Awaited<ReturnType<typeof sessionQueries.selectSessionsByUserIdStatement.execute>>[number]
export type SessionResultSummary = Awaited<ReturnType<typeof sessionQueries.selectSessionResultsByScoreDescStatement.execute>>[number]
export type SessionResultDetail = Awaited<ReturnType<typeof sessionQueries.selectSessionResultByIdStatement.execute>>[number]
export type SessionFileRow = Awaited<ReturnType<typeof sessionQueries.selectSessionFilesStatement.execute>>[number]
export type SessionFileView = Omit<SessionFileRow, "size"> & { size: number }
