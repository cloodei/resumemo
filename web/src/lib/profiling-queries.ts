import { keepPreviousData } from "@tanstack/react-query"

import { api } from "./api"
import { getEdenErrorMessage } from "./errors"

export type SessionStatus = "processing" | "retrying" | "completed" | "failed"

export type ProfilingSession = {
	id: string
	name: string
	jobTitle: string | null
	jobDescription: string
	status: SessionStatus
	totalFiles: number
	errorMessage: string | null
	createdAt: string | Date
	lastCompletedAt?: string | Date | null
}

export type SessionFile = {
	fileId: number
	originalName: string
	mimeType: string
	size: number
}

export type ParsedProfile = {
	name_confidence?: number | null
	parse_warnings?: string[] | null
	total_experience_years?: number | null
	work_history?: {
		title?: string | null
		company?: string | null
		start_date?: string | null
		end_date?: string | null
		description?: string | null
	}[] | null
	education?: Array<{
		degree?: string | null
		institution?: string | null
		year?: number | null
	}> | null
	certifications?: string[] | null
	skills?: string[] | null
} | null

export type CandidateResult = {
	rank?: number
	id: string
	runId?: string
	fileId: number
	candidateName: string | null
	candidateEmail: string | null
	candidatePhone: string | null
	parsedProfile?: ParsedProfile
	overallScore: number
	summary: string
	skillsMatched: string[] | null
	originalName: string
	createdAt?: string | Date | null
}

export type ScoreDetail = {
	score: number
	weight: number
	description: string
	details?: Record<string, unknown>
}

export type CandidateResultDetail = CandidateResult & {
	rawText: string
	scoreBreakdown: Record<string, ScoreDetail>
	mimeType?: string
}

export type ProfilingSessionResponse = {
	session: ProfilingSession
	files: SessionFile[]
	results: CandidateResult[] | null
}

async function fetchProfilingSession(id: string): Promise<ProfilingSessionResponse> {
	const { data, error } = await api.api.v2.sessions({ id }).get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load profiling session")

	return {
		session: data.session as ProfilingSession,
		files: ((data.files || []) as Array<SessionFile & { id?: number }>).map(file => ({
			...file,
			fileId: Number(file.fileId ?? file.id),
			size: Number(file.size),
		})),
		results: ((data.results || null) as CandidateResult[] | null)?.map(result => ({
			...result,
			fileId: Number(result.fileId),
			overallScore: Number(result.overallScore),
		})) ?? null,
	}
}

async function fetchCandidateResultDetail(args: { sessionId: string; resultId: string }) {
	const { data, error } = await api.api.v2.sessions({ id: args.sessionId }).results({ resultId: args.resultId }).get()
	if (error || !data?.result)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load candidate details")

	return {
		...data.result,
		fileId: Number(data.result.fileId),
		overallScore: Number(data.result.overallScore),
	} as CandidateResultDetail
}

async function fetchProfilingSessions() {
	const { data, error } = await api.api.v2.sessions.get()
	if (error || !data)
		throw new Error(getEdenErrorMessage(error) ?? "Could not load sessions")

	return data.sessions as ProfilingSession[]
}

export function profilingSessionQueryOptions(id: string) {
	return {
		queryKey: ["profiling-session", id],
		queryFn: () => fetchProfilingSession(id),
		refetchInterval: (query: { state: { data?: ProfilingSessionResponse } }) => {
			const status = query.state.data?.session.status
			return status === "processing" || status === "retrying" ? 8000 : false
		},
		placeholderData: keepPreviousData,
	}
}

export function candidateDetailQueryOptions(sessionId: string, resultId: string) {
	return {
		queryKey: ["profiling-session", sessionId, "result", resultId],
		queryFn: () => fetchCandidateResultDetail({ sessionId, resultId }),
		enabled: Boolean(sessionId) && Boolean(resultId),
	}
}

export function profilingSessionsQueryOptions() {
	return {
		queryKey: ["profiling-sessions"],
		queryFn: fetchProfilingSessions,
		refetchInterval: (query: { state: { data?: ProfilingSession[] } }) => {
			const sessions = query.state.data ?? []
			return sessions.some(session => session.status === "processing" || session.status === "retrying") ? 8000 : false
		},
		placeholderData: keepPreviousData,
	}
}
