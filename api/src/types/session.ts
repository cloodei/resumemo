import * as sessionQueries from "~/sql/session"
import { RepositoryResult } from "."

export type SessionSort = "asc" | "desc"

export type SessionListItem = Awaited<ReturnType<typeof sessionQueries.selectSessionsByUserIdStatement.execute>>[number]
export type SessionResultSummary = Awaited<ReturnType<typeof sessionQueries.selectSessionResultsByScoreDescStatement.execute>>[number]
export type SessionResultDetail = Awaited<ReturnType<typeof sessionQueries.selectSessionResultByIdStatement.execute>>[number]
export type SessionFileRow = Awaited<ReturnType<typeof sessionQueries.selectSessionFilesStatement.execute>>[number]
export type SessionFileView = Omit<SessionFileRow, "size"> & { size: number }

export type SessionRepositoryResult<T> = RepositoryResult<T, { message: string }>

export function success<T>(data: T): SessionRepositoryResult<T> {
	return { ok: true, data }
}

export function failure(message: string): SessionRepositoryResult<never> {
	return { ok: false, error: { message } }
}

export function isSessionRepositoryFailure<T>(value: SessionRepositoryResult<T>): value is {
	ok: false; error: { message: string }
} {
	return !value.ok
}
