import { and, desc, eq, sql } from "drizzle-orm";

import * as schema from "@resumemo/core/schemas";

import { db } from "~/lib/db";
import { repositoryCache } from "~/lib/repository-cache";

export type SessionSort = "asc" | "desc";
type CandidateResultRow = typeof schema.candidateResult.$inferSelect;

export type SessionRepositoryError = {
	code: "session-not-found" | "files-not-found" | "result-not-found" | "session-not-completed";
	message: string;
};

type SessionRepositoryResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: SessionRepositoryError };

function sessionRepositorySuccess<T>(data: T): SessionRepositoryResult<T> {
	return { ok: true, data };
}

function sessionRepositoryFailure(
	code: SessionRepositoryError["code"],
	message: string,
): SessionRepositoryResult<never> {
	return {
		ok: false,
		error: { code, message },
	};
}

const listSessionsByUserStatement = db
	.select()
	.from(schema.profilingSession)
	.where(eq(schema.profilingSession.userId, sql.placeholder("userId")))
	.orderBy(desc(schema.profilingSession.createdAt))
	.prepare("session_list_by_user");
const getOwnedSessionStatement = db
	.select()
	.from(schema.profilingSession)
	.where(
		and(
			eq(schema.profilingSession.id, sql.placeholder("sessionId")),
			eq(schema.profilingSession.userId, sql.placeholder("userId")),
		),
	)
	.prepare("session_get_owned_base");

const getSessionFilesStatement = db
	.select({
		id: schema.resumeFile.id,
		originalName: schema.resumeFile.originalName,
		mimeType: schema.resumeFile.mimeType,
		size: schema.resumeFile.size,
	})
	.from(schema.profilingSessionFile)
	.innerJoin(schema.resumeFile, eq(schema.profilingSessionFile.fileId, schema.resumeFile.id))
	.where(eq(schema.profilingSessionFile.sessionId, sql.placeholder("sessionId")))
	.prepare("session_get_files_by_session_id");

const getSessionResultsDescStatement = db
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
	.prepare("session_get_results_desc");

const getSessionResultsAscStatement = db
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
	.prepare("session_get_results_asc");

const getSessionResultDetailStatement = db
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
	.prepare("session_get_result_detail");

const getRetrySessionStatement = db
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
	.prepare("session_get_retry_preview");

const getRetryFilesStatement = db
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
	.prepare("session_get_retry_files");

const markSessionFailedStatement = db
	.update(schema.profilingSession)
	.set({
		status: schema.profilingSession.status,
		errorMessage: schema.profilingSession.errorMessage,
		lastCompletedAt: schema.profilingSession.lastCompletedAt,
	})
	.where(eq(schema.profilingSession.id, sql.placeholder("sessionId")))
	.returning()
	.prepare("session_mark_failed");

const updateSessionRetryingStatement = db
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

export type SessionListItem = Awaited<ReturnType<typeof listSessionsByUserStatement.execute>>[number];
export type ProfilingSession = Awaited<ReturnType<typeof getOwnedSessionStatement.execute>>[number];
export type SessionResultSummary = Awaited<ReturnType<typeof getSessionResultsDescStatement.execute>>[number];
export type SessionResultDetail = Awaited<ReturnType<typeof getSessionResultDetailStatement.execute>>[number];
type SessionFileRow = Awaited<ReturnType<typeof getSessionFilesStatement.execute>>[number];
export type SessionFileView = Omit<SessionFileRow, "size"> & { size: number };

export type SessionCreateInputFile = {
	storageKey: string;
	fileName: string;
	mimeType: string;
	size: number;
};

export type SessionCreatedFileRecord = {
	fileId: number;
	storageKey: string;
	originalName: string;
	mimeType: string;
	size: bigint;
};

export type CreateSessionInput = {
	userId: string;
	name: string;
	jobDescription: string;
	jobTitle: string | null;
	runId: string;
	files: SessionCreateInputFile[];
};

export type RetrySourceFile = {
	fileId: number;
	storageKey: string;
	originalName: string;
	mimeType: string;
	size: bigint;
};
export type SessionRetryMode = "rerun_current" | "clone_current" | "clone_with_updates" | "replace_with_updates";

export type RetryMutationInput = {
	mode: SessionRetryMode;
	userId: string;
	sessionId: string;
	runId: string;
	name: string;
	jobTitle: string | null;
	jobDescription: string;
	files: RetrySourceFile[];
};

export type SessionResultUpsertInput = {
	file_id: number;
	candidate_name: string | null;
	candidate_email: string | null;
	candidate_phone: string | null;
	raw_text: string;
	parsed_profile: Record<string, unknown>;
	overall_score: number;
	score_breakdown: Record<string, unknown>;
	summary: string;
	skills_matched: string[];
};

export const sessionRepositoryCacheKeys = {
	entity: (sessionId: string) => `session:entity:${sessionId}` as const,
	files: (sessionId: string) => `session:files:${sessionId}` as const,
	list: (userId: string) => `session:list:${userId}` as const,
	detail: (userId: string, sessionId: string) => `session:detail:${userId}:${sessionId}` as const,
	results: (userId: string, sessionId: string, sort: SessionSort) => `session:results:${userId}:${sessionId}:${sort}` as const,
	resultsData: (sessionId: string, sort: SessionSort, activeRunId: string | null) => `session:results-data:${sessionId}:${sort}:${activeRunId ?? "none"}` as const,
	result: (userId: string, sessionId: string, resultId: string) => `session:result:${userId}:${sessionId}:${resultId}` as const,
	resultEntity: (sessionId: string, resultId: string) => `result:entity:${sessionId}:${resultId}` as const,
};

export function isSessionRepositoryFailure<T>(value: SessionRepositoryResult<T>): value is {
	ok: false;
	error: SessionRepositoryError
} {
	return !value.ok;
}

function filterActiveRunResults<T extends { runId?: string | null }>(results: T[], activeRunId: string | null) {
	if (!activeRunId)
		return results;

	return results.filter(result => result.runId === activeRunId);
}

function patchSessionListEntry(
	sessions: SessionListItem[],
	nextSession: ProfilingSession,
	prependIfMissing?: boolean,
) {
	let found = false;
	const patched = sessions.map((session) => {
		if (session.id !== nextSession.id)
			return session;

		found = true;
		return {
			...session,
			...nextSession,
		};
	});

	if (!found && prependIfMissing)
		return [nextSession, ...patched];

	return patched;
}

function setSessionResultsCaches(
	userId: string,
	sessionId: string,
	activeRunId: string | null,
	sessionStatus: ProfilingSession["status"],
	results: SessionResultSummary[],
) {
	for (const sort of ["asc", "desc"] as const) {
		repositoryCache.set(
			sessionRepositoryCacheKeys.resultsData(sessionId, sort, activeRunId),
			sort === "asc"
				? [...results].sort((left, right) => Number(left.overallScore) - Number(right.overallScore))
				: [...results].sort((left, right) => Number(right.overallScore) - Number(left.overallScore)),
		);

		repositoryCache.set(sessionRepositoryCacheKeys.results(userId, sessionId, sort), {
			sessionId,
			sessionStatus,
			totalResults: results.length,
			results: sort === "asc"
				? [...results].sort((left, right) => Number(left.overallScore) - Number(right.overallScore))
				: [...results].sort((left, right) => Number(right.overallScore) - Number(left.overallScore)),
		});
	}

	for (const result of results) {
		repositoryCache.set(sessionRepositoryCacheKeys.resultEntity(sessionId, result.id), result);
		repositoryCache.deleteWhere(key => key === sessionRepositoryCacheKeys.result(userId, sessionId, result.id));
	}
}

function clearSessionResultCaches(userId: string, sessionId: string) {
	repositoryCache.deleteMany([
		sessionRepositoryCacheKeys.results(userId, sessionId, "asc"),
		sessionRepositoryCacheKeys.results(userId, sessionId, "desc"),
	]);
	repositoryCache.deleteWhere(key => key.startsWith(`session:results-data:${sessionId}:`));
	repositoryCache.deleteWhere(key => key.startsWith(`session:result:${userId}:${sessionId}:`));
	repositoryCache.deleteWhere(key => key.startsWith(`result:entity:${sessionId}:`));
}

function primeSessionCaches(payload: {
	session: ProfilingSession;
	files: SessionFileView[];
	results: SessionResultSummary[] | null;
}) {
	const session = payload.session;
	repositoryCache.set(sessionRepositoryCacheKeys.entity(session.id), session);
	repositoryCache.set(sessionRepositoryCacheKeys.files(session.id), payload.files);

	repositoryCache.update<{ sessions: SessionListItem[] }>(
		sessionRepositoryCacheKeys.list(session.userId),
		current => ({
			sessions: patchSessionListEntry(current.sessions, session, true),
		}),
	);

	repositoryCache.set(sessionRepositoryCacheKeys.detail(session.userId, session.id), {
		session,
		files: payload.files,
		results: payload.results,
	});

	setSessionResultsCaches(session.userId, session.id, session.activeRunId, session.status, payload.results ?? []);
}

function patchSessionState(payload: {
	session: ProfilingSession;
	files: SessionFileView[];
	results: SessionResultSummary[] | null;
}) {
	const session = payload.session;
	repositoryCache.set(sessionRepositoryCacheKeys.entity(session.id), session);
	repositoryCache.set(sessionRepositoryCacheKeys.files(session.id), payload.files);

	repositoryCache.update<{ sessions: SessionListItem[] }>(
		sessionRepositoryCacheKeys.list(session.userId),
		current => ({
			sessions: patchSessionListEntry(current.sessions, session),
		}),
	);

	repositoryCache.update(
		sessionRepositoryCacheKeys.detail(session.userId, session.id),
		current => ({
			session,
			files: payload.files,
			results: payload.results,
		}),
	);

	clearSessionResultCaches(session.userId, session.id);
	setSessionResultsCaches(session.userId, session.id, session.activeRunId, session.status, payload.results ?? []);
}

function buildResultSummaryFromInsert(result: CandidateResultRow, file: SessionFileView | undefined): SessionResultSummary {
	return {
		id: result.id,
		runId: result.runId,
		fileId: result.fileId,
		candidateName: result.candidateName,
		candidateEmail: result.candidateEmail,
		candidatePhone: result.candidatePhone,
		parsedProfile: result.parsedProfile,
		overallScore: result.overallScore,
		summary: result.summary,
		skillsMatched: result.skillsMatched,
		createdAt: result.createdAt,
		originalName: file?.originalName ?? "Unknown file",
	};
}

function buildResultDetailFromInsert(result: CandidateResultRow, file: SessionFileView | undefined): SessionResultDetail {
	return {
		id: result.id,
		runId: result.runId,
		sessionId: result.sessionId,
		fileId: result.fileId,
		candidateName: result.candidateName,
		candidateEmail: result.candidateEmail,
		candidatePhone: result.candidatePhone,
		rawText: result.rawText,
		parsedProfile: result.parsedProfile,
		overallScore: result.overallScore,
		scoreBreakdown: result.scoreBreakdown,
		summary: result.summary,
		skillsMatched: result.skillsMatched,
		createdAt: result.createdAt,
		originalName: file?.originalName ?? "Unknown file",
		mimeType: file?.mimeType ?? "application/octet-stream",
	};
}

async function getOwnedSession(userId: string, sessionId: string): Promise<ProfilingSession | null> {
	const entityKey = sessionRepositoryCacheKeys.entity(sessionId);
	const cached = repositoryCache.get<ProfilingSession>(entityKey);
	if (cached && cached.userId === userId)
		return cached;

	const rows = await getOwnedSessionStatement.execute({ userId, sessionId });
	const session = rows[0] ?? null;
	if (session)
		repositoryCache.set(entityKey, session);

	return session;
}

async function getSessionFiles(sessionId: string): Promise<SessionFileView[]> {
	const filesKey = sessionRepositoryCacheKeys.files(sessionId);
	const cached = repositoryCache.get<SessionFileView[]>(filesKey);
	if (cached)
		return cached;

	const rows = await getSessionFilesStatement.execute({ sessionId });
	const files = rows.map(file => ({
		id: file.id,
		originalName: file.originalName,
		mimeType: file.mimeType,
		size: Number(file.size),
	}));

	repositoryCache.set(filesKey, files);
	return files;
}

async function getSessionResultsFromSource(
	sessionId: string,
	sort: SessionSort,
	activeRunId: string | null,
): Promise<SessionResultSummary[]> {
	const resultsKey = sessionRepositoryCacheKeys.resultsData(sessionId, sort, activeRunId);
	const cached = repositoryCache.get<SessionResultSummary[]>(resultsKey);
	if (cached)
		return cached;

	const rows = sort === "asc"
		? await getSessionResultsAscStatement.execute({ sessionId })
		: await getSessionResultsDescStatement.execute({ sessionId });

	const filteredResults = filterActiveRunResults(rows, activeRunId);
	repositoryCache.set(resultsKey, filteredResults);

	for (const result of filteredResults)
		repositoryCache.set(sessionRepositoryCacheKeys.resultEntity(sessionId, result.id), result);

	return filteredResults;
}

function toSessionFileView(file: { fileId: number; originalName: string; mimeType: string; size: bigint }): SessionFileView {
	return {
		id: file.fileId,
		originalName: file.originalName,
		mimeType: file.mimeType,
		size: Number(file.size),
	};
}

async function getRetryPreview(userId: string, sessionId: string) {
	const sessions = await getRetrySessionStatement.execute({ userId, sessionId });
	const session = sessions[0] ?? null;
	if (!session)
		return null;

	const files = await getRetryFilesStatement.execute({ sessionId });
	return { session, files };
}



export const sessionRepository = {
	async getRetryPreview(userId: string, sessionId: string) {
		return await getRetryPreview(userId, sessionId);
	},

	async listByUser(userId: string) {
		return await repositoryCache.getOrLoad(
			sessionRepositoryCacheKeys.list(userId),
			async () => {
				const sessions = await listSessionsByUserStatement.execute({ userId });
				for (const session of sessions)
					repositoryCache.set(sessionRepositoryCacheKeys.entity(session.id), session);

				return { sessions };
			},
		);
	},

	async getDetail(userId: string, sessionId: string) {
		const cached = repositoryCache.get<{
			session: ProfilingSession;
			files: SessionFileView[];
			results: SessionResultSummary[] | null;
		}>(sessionRepositoryCacheKeys.detail(userId, sessionId));
		if (cached)
			return sessionRepositorySuccess(cached);

		const session = await getOwnedSession(userId, sessionId);
		if (!session)
			return sessionRepositoryFailure("session-not-found", "Session not found");

		const files = await getSessionFiles(sessionId);
		if (files.length === 0)
			return sessionRepositoryFailure("files-not-found", "Files not found");

		let results: SessionResultSummary[] | null = null;
		if (session.status === "completed")
			results = await getSessionResultsFromSource(sessionId, "desc", session.activeRunId ?? null);

		const data = { session, files, results };
		repositoryCache.set(sessionRepositoryCacheKeys.detail(userId, sessionId), data);
		return sessionRepositorySuccess(data);
	},

	async getResults(userId: string, sessionId: string, sort: SessionSort) {
		const cached = repositoryCache.get<{
			sessionId: string;
			sessionStatus: ProfilingSession["status"];
			totalResults: number;
			results: SessionResultSummary[];
		}>(sessionRepositoryCacheKeys.results(userId, sessionId, sort));
		if (cached)
			return sessionRepositorySuccess(cached);

		const session = await getOwnedSession(userId, sessionId);
		if (!session)
			return sessionRepositoryFailure("session-not-found", "Session not found");

		const results = await getSessionResultsFromSource(sessionId, sort, session.activeRunId ?? null);
		const data = {
			sessionId,
			sessionStatus: session.status,
			totalResults: results.length,
			results,
		};
		repositoryCache.set(sessionRepositoryCacheKeys.results(userId, sessionId, sort), data);
		return sessionRepositorySuccess(data);
	},

	async getResult(userId: string, sessionId: string, resultId: string) {
		const cached = repositoryCache.get<{ result: SessionResultDetail }>(
			sessionRepositoryCacheKeys.result(userId, sessionId, resultId),
		);
		if (cached)
			return sessionRepositorySuccess(cached);

		const session = await getOwnedSession(userId, sessionId);
		if (!session)
			return sessionRepositoryFailure("session-not-found", "Session not found");

		const rows = await getSessionResultDetailStatement.execute({ sessionId, resultId });
		const [result] = filterActiveRunResults(rows, session.activeRunId ?? null);
		if (!result)
			return sessionRepositoryFailure("result-not-found", "Result not found");

		repositoryCache.set(sessionRepositoryCacheKeys.resultEntity(sessionId, result.id), result);
		const data = { result };
		repositoryCache.set(sessionRepositoryCacheKeys.result(userId, sessionId, resultId), data);
		return sessionRepositorySuccess(data);
	},

	async getExportData(userId: string, sessionId: string) {
		const session = await getOwnedSession(userId, sessionId);
		if (!session)
			return sessionRepositoryFailure("session-not-found", "Session not found");
		if (session.status !== "completed")
			return sessionRepositoryFailure("session-not-completed", "Session is not completed yet");

		const resultsResponse = await this.getResults(userId, sessionId, "desc");
		if (isSessionRepositoryFailure(resultsResponse))
			return resultsResponse;

		return sessionRepositorySuccess({
			session: {
				id: session.id,
				name: session.name,
				status: session.status,
				activeRunId: session.activeRunId,
			},
			results: resultsResponse.data.results,
		});
	},

	async createSession(input: CreateSessionInput) {
		let sessionSnapshot: {
			id: string;
			name: string;
			createdAt: Date;
			updatedAt: Date;
			userId: string;
			jobDescription: string;
			jobTitle: string | null;
			status: "processing" | "retrying" | "completed" | "failed";
			totalFiles: number;
			activeRunId: string | null;
			errorMessage: string | null;
			lastCompletedAt: Date | null;
		} | undefined;
		let createdFiles: SessionCreatedFileRecord[] = [];

		await db.transaction(async (tx) => {
			const [[createdSession], created] = await Promise.all([
				tx.insert(schema.profilingSession)
					.values({
						userId: input.userId,
						name: input.name,
						jobDescription: input.jobDescription,
						jobTitle: input.jobTitle,
						status: "processing",
						activeRunId: input.runId,
						totalFiles: input.files.length,
						errorMessage: null,
						lastCompletedAt: null,
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
					})
			]);

			createdFiles = created;
			await tx.insert(schema.profilingSessionFile).values(
				createdFiles.map(file => ({
					sessionId: createdSession.id,
					fileId: file.fileId,
				})),
			);

			sessionSnapshot = createdSession;
		});

		if (!sessionSnapshot)
			throw new Error("Session create transaction did not return a session");

		const cachePayload = {
			session: sessionSnapshot,
			files: createdFiles.map(toSessionFileView),
			results: [],
		};

		primeSessionCaches(cachePayload);

		return {
			session: sessionSnapshot,
			files: createdFiles,
			cachePayload,
		};
	},

	async markSessionFailed(userId: string, sessionId: string, message: string) {
		const rows = await markSessionFailedStatement.execute({
			sessionId,
			status: "failed",
			errorMessage: message,
			lastCompletedAt: null,
		});
		const [session] = rows;

		if (!session)
			return;

		const files = await getSessionFiles(sessionId);
		patchSessionState({
			session,
			files,
			results: [],
		});
		repositoryCache.deleteWhere(key => key.startsWith(`session:result:${userId}:${sessionId}:`));
	},

	async applyRetryMutation(input: RetryMutationInput) {
		if (input.mode === "clone_current" || input.mode === "clone_with_updates") {
			let sessionSnapshot: {
				id: string;
				name: string;
				createdAt: Date;
				updatedAt: Date;
				userId: string;
				jobDescription: string;
				jobTitle: string | null;
				status: "processing" | "retrying" | "completed" | "failed";
				totalFiles: number;
				activeRunId: string | null;
				errorMessage: string | null;
				lastCompletedAt: Date | null;
			} | undefined;
			await db.transaction(async (tx) => {
				const [createdSession] = await tx.insert(schema.profilingSession)
					.values({
						userId: input.userId,
						name: input.name,
						jobDescription: input.jobDescription,
						jobTitle: input.jobTitle,
						status: "processing",
						activeRunId: input.runId,
						totalFiles: input.files.length,
						errorMessage: null,
						lastCompletedAt: null,
					})
					.returning();

				await tx.insert(schema.profilingSessionFile).values(
					input.files.map(file => ({
						sessionId: createdSession.id,
						fileId: file.fileId,
					})),
				);

				sessionSnapshot = createdSession;
			});

			if (!sessionSnapshot)
				throw new Error("Clone retry transaction did not return a session");

			const cachePayload = {
				session: sessionSnapshot,
				files: input.files.map(toSessionFileView),
				results: [],
			};

			primeSessionCaches(cachePayload);

			return {
				targetSessionId: sessionSnapshot.id,
				status: "processing",
				cachePayload,
			};
		}

		const rows = await updateSessionRetryingStatement.execute({
			sessionId: input.sessionId,
			name: input.name,
			jobTitle: input.jobTitle,
			jobDescription: input.jobDescription,
			status: "retrying",
			activeRunId: input.runId,
			errorMessage: null,
			lastCompletedAt: null,
			totalFiles: input.files.length,
		});
		const [session] = rows;

		if (!session)
			throw new Error("Retry update did not return a session");

		const cachePayload = {
			session,
			files: input.files.map(toSessionFileView),
			results: [],
		};

		patchSessionState(cachePayload);

		return {
			targetSessionId: session.id,
			status: "retrying",
			cachePayload,
		};
	},

	async applyPipelineCompletion(params: {
		userId: string;
		sessionId: string;
		runId: string;
		results: SessionResultUpsertInput[];
	}) {
		let session: ProfilingSession | null = null;
		let insertedResults: CandidateResultRow[] = [];

		await db.transaction(async (tx) => {
			const [_, updatedSessions, inserted] = await Promise.all([
				tx.delete(schema.candidateResult)
					.where(
						and(
							eq(schema.candidateResult.sessionId, params.sessionId),
							eq(schema.candidateResult.runId, params.runId),
						),
					),
				tx.update(schema.profilingSession)
					.set({
						status: "completed",
						errorMessage: null,
						lastCompletedAt: new Date(),
					})
					.where(
						and(
							eq(schema.profilingSession.id, params.sessionId),
							eq(schema.profilingSession.activeRunId, params.runId),
						),
					)
					.returning(),
				params.results.length > 0 ? tx.insert(schema.candidateResult).values(
					params.results.map(result => ({
						sessionId: params.sessionId,
						runId: params.runId,
						fileId: result.file_id,
						candidateName: result.candidate_name,
						candidateEmail: result.candidate_email,
						candidatePhone: result.candidate_phone,
						rawText: result.raw_text,
						parsedProfile: result.parsed_profile,
						overallScore: String(result.overall_score),
						scoreBreakdown: result.score_breakdown,
						summary: result.summary,
						skillsMatched: result.skills_matched,
					})),
				).returning() : [],
			]);

			session = updatedSessions[0] ?? null;
			insertedResults = inserted;
		});

		if (!session)
			return;

		const files = await getSessionFiles(params.sessionId);
		const fileMap = new Map(files.map(file => [file.id, file]));
		const summaries = insertedResults.map(result => buildResultSummaryFromInsert(result, fileMap.get(result.fileId)));

		patchSessionState({
			session,
			files,
			results: summaries,
		});

		for (const result of insertedResults) {
			const detail = buildResultDetailFromInsert(result, fileMap.get(result.fileId));
			repositoryCache.set(sessionRepositoryCacheKeys.result(params.userId, params.sessionId, result.id), { result: detail });
			repositoryCache.set(sessionRepositoryCacheKeys.resultEntity(params.sessionId, result.id), detail);
		}
	},

	async applyPipelineError(params: {
		userId: string;
		sessionId: string;
		runId: string;
		error: string;
		partialResults: SessionResultUpsertInput[];
	}) {
		let session: ProfilingSession | null = null;
		let insertedResults: CandidateResultRow[] = [];

		await db.transaction(async (tx) => {
			const [_, updatedSessions, inserted] = await Promise.all([
				tx.delete(schema.candidateResult)
				.where(
					and(
						eq(schema.candidateResult.sessionId, params.sessionId),
						eq(schema.candidateResult.runId, params.runId),
					),
				),
				tx.update(schema.profilingSession)
					.set({
						status: "failed",
						errorMessage: params.error,
						lastCompletedAt: null,
					})
					.where(
						and(
							eq(schema.profilingSession.id, params.sessionId),
							eq(schema.profilingSession.activeRunId, params.runId),
						),
					)
					.returning(),
				params.partialResults.length > 0 ? tx.insert(schema.candidateResult).values(
					params.partialResults.map(result => ({
						sessionId: params.sessionId,
						runId: params.runId,
						fileId: result.file_id,
						candidateName: result.candidate_name,
						candidateEmail: result.candidate_email,
						candidatePhone: result.candidate_phone,
						rawText: result.raw_text,
						parsedProfile: result.parsed_profile,
						overallScore: String(result.overall_score),
						scoreBreakdown: result.score_breakdown,
						summary: result.summary,
						skillsMatched: result.skills_matched,
					})),
				).returning() : [],
			]);

			session = updatedSessions[0] ?? null;
			insertedResults = inserted;
		});

		if (!session)
			return;

		const files = await getSessionFiles(params.sessionId);
		const fileMap = new Map(files.map(file => [file.id, file]));
		const summaries = insertedResults.map(result => buildResultSummaryFromInsert(result, fileMap.get(result.fileId)));

		patchSessionState({
			session,
			files,
			results: summaries,
		});

		for (const result of insertedResults) {
			const detail = buildResultDetailFromInsert(result, fileMap.get(result.fileId));
			repositoryCache.set(sessionRepositoryCacheKeys.result(params.userId, params.sessionId, result.id), { result: detail });
			repositoryCache.set(sessionRepositoryCacheKeys.resultEntity(params.sessionId, result.id), detail);
		}
	},
};
