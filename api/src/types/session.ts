import * as sessionQueries from "~/sql/session"
import { RepositoryResult } from "."

export type SessionSort = "asc" | "desc"

export type SessionListItem = Awaited<ReturnType<typeof sessionQueries.selectSessionsByUserIdStatement.execute>>[number]
export type SessionResultSummary = Awaited<ReturnType<typeof sessionQueries.selectSessionResultsByScoreDescStatement.execute>>[number]
export type SessionResultDetail = Awaited<ReturnType<typeof sessionQueries.selectSessionResultByIdStatement.execute>>[number]
export type RetrySession = Awaited<ReturnType<typeof sessionQueries.selectOwnedSessionRetryRowStatement.execute>>[number]
export type RetryFile = Awaited<ReturnType<typeof sessionQueries.selectSessionRetryFilesStatement.execute>>[number]
export type SessionFileRow = Awaited<ReturnType<typeof sessionQueries.selectSessionFilesStatement.execute>>[number]
export type SessionFileView = Omit<SessionFileRow, "size"> & { size: number }

export type SessionRepositoryError = {
	code: "session-not-found" | "files-not-found" | "result-not-found" | "session-not-completed"
	message: string
}
export type SessionRepositoryResult<T> = RepositoryResult<T, SessionRepositoryError>

export function success<T>(data: T): SessionRepositoryResult<T> {
	return { ok: true, data }
}

export function failure(code: SessionRepositoryError["code"], message: string): SessionRepositoryResult<never> {
	return { ok: false, error: { code, message } }
}

export function isSessionRepositoryFailure<T>(value: SessionRepositoryResult<T>): value is { ok: false; error: SessionRepositoryError } {
	return !value.ok
}
