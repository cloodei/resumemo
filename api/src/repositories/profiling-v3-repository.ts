import { screeningRepository } from "~/modules/screening/repository"

type PipelineUpdateArgs = Parameters<typeof screeningRepository.applyPipelineUpdate>[0]

export const profilingV3Repository = {
	getOwnedJobDescriptionById: screeningRepository.getOwnedJobDescription,
	listJobDescriptionsByUserId: screeningRepository.listJobDescriptions,
	getOwnedSessionById: screeningRepository.getOwnedSession,
	getSessionById: screeningRepository.getSession,
	listSessionsByUserId: screeningRepository.listSessions,
	listSessionFiles: screeningRepository.listSessionFiles,
	listSessionResults: (
		sessionId: string,
		sort: "asc" | "desc",
		activeRunId: string | null,
	) => screeningRepository.listSessionResults(sessionId, activeRunId, sort),
	getSessionResultById: (
		sessionId: string,
		resultId: string,
		activeRunId: string | null,
	) => screeningRepository.getSessionResult(sessionId, resultId, activeRunId),
	updateSessionFailure: screeningRepository.markSessionFailed,
	replaceRunResultsAndSetCompleted: (input: {
		sessionId: string
		runId: string
		jobDescriptionArtifact: PipelineUpdateArgs["jobDescriptionArtifact"]
		results: PipelineUpdateArgs["results"]
	}) => screeningRepository.applyPipelineUpdate({
		...input,
		status: "completed",
	}),
	replaceRunResultsAndSetFailed: (input: {
		sessionId: string
		runId: string
		error: string
		jobDescriptionArtifact: PipelineUpdateArgs["jobDescriptionArtifact"]
		partialResults: PipelineUpdateArgs["results"]
	}) => screeningRepository.applyPipelineUpdate({
		sessionId: input.sessionId,
		runId: input.runId,
		status: "failed",
		error: input.error,
		jobDescriptionArtifact: input.jobDescriptionArtifact,
		results: input.partialResults,
	}),
}
