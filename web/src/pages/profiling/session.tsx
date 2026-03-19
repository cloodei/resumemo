import { toast } from "sonner"
import { useNavigate, useParams } from "react-router-dom"
import { Suspense, useMemo, useState } from "react"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"

import * as Profiling from "@/components/features/profiling"
import { api } from "@/lib/api"
import { BASE_URL } from "@/lib/constants"
import { formatFileSize } from "@/lib/utils"
import { QueryErrorBoundary } from "@/components/feedback/query-error-boundary"
import { RouteErrorFallback } from "@/components/feedback/route-error-fallback"
import { ProfilingSessionSkeleton } from "@/components/feedback/route-skeletons"
import { profilingSessionQueryOptions } from "@/lib/profiling-queries"
import { getEdenErrorMessage, getErrorMessage } from "@/lib/errors"

function ProfilingSessionContent() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [retryDialogOpen, setRetryDialogOpen] = useState(false)
	const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
	const [selectedRetryMode, setSelectedRetryMode] = useState<Profiling.RetryMode>("rerun_current")

	if (!id)
		throw new Error("Missing session id")

	const { data } = useSuspenseQuery(profilingSessionQueryOptions(id))
	const session = data.session
	const files = data.files
	const results = useMemo(() => {
		if (session.status !== "completed" || !data.results)
			return []

		return data.results.map((candidate, index) => ({
			...candidate,
			overallScore: Number(candidate.overallScore),
			rank: index + 1,
		}))
	}, [data.results, session.status])

	const isCompleted = session.status === "completed"
	const isFailed = session.status === "failed"
	const isRunning = session.status === "processing" || session.status === "retrying"

	const manualReviewCount = useMemo(() => results.filter(Profiling.needsManualReview).length, [results])
	const strongMatches = useMemo(() => results.filter(candidate => candidate.overallScore >= 80).length, [results])
	const averageScore = useMemo(() => {
		if (results.length === 0)
			return 0

		return Math.round(results.reduce((accumulator, candidate) => accumulator + candidate.overallScore, 0) / results.length)
	}, [results])

	const retryMutation = useMutation({
		mutationFn: async (values: Profiling.RetryFormValues) => {
			const selectedRetryCopy = Profiling.retryModeCopy[selectedRetryMode]
			const payload = selectedRetryCopy.requiresUpdates
				? {
					mode: selectedRetryMode,
					name: values.name.trim(),
					jobTitle: values.jobTitle.trim() || undefined,
					jobDescription: values.jobDescription.trim(),
				}
				: { mode: selectedRetryMode }

			const { data, error } = await api.api.v2.sessions({ id }).retry.post(payload)
			if (error || !data) {
				const errorValue = error?.value && typeof error.value === "object"
					? error.value as Record<string, unknown>
					: null
				const message = errorValue && typeof errorValue.message === "string"
					? errorValue.message
					: undefined
				const details = errorValue && typeof errorValue.details === "string"
					? errorValue.details
					: undefined
				const targetSessionId = errorValue && typeof errorValue.targetSessionId === "string"
					? errorValue.targetSessionId
					: undefined

				const retryError = new Error(getEdenErrorMessage(error) || message || "Could not start retry flow") as Error & {
					messageForUi?: string
					detailsForUi?: string
					targetSessionIdForUi?: string
				}
				retryError.messageForUi = message
				retryError.detailsForUi = details
				retryError.targetSessionIdForUi = targetSessionId

				throw retryError
			}

			return data
		},
		onSuccess: async (response) => {
			const selectedRetryCopy = Profiling.retryModeCopy[selectedRetryMode]
			toast.success(selectedRetryCopy.target === "current"
				? "Retry started in the background"
				: "A new background session has been created")
			setRetryDialogOpen(false)

			const targetSessionId = response.targetSessionId ?? response.sessionId
			await queryClient.invalidateQueries({ queryKey: ["profiling-sessions"] })

			if (targetSessionId && targetSessionId !== id) {
				navigate(`/profiling/${targetSessionId}`)
				return
			}

			await queryClient.invalidateQueries({ queryKey: ["profiling-session", id] })
		},
		onError: (error) => {
			const typedError = error as Error & {
				messageForUi?: string
				detailsForUi?: string
				targetSessionIdForUi?: string
			}

			if (typedError.targetSessionIdForUi) {
				void queryClient.invalidateQueries({ queryKey: ["profiling-session", typedError.targetSessionIdForUi] })

				if (typedError.targetSessionIdForUi === id) {
					toast.error(typedError.messageForUi ?? "We couldn't restart processing.")
					return
				}

				toast.error(typedError.messageForUi ?? "We couldn't restart processing.")
				navigate(`/profiling/${typedError.targetSessionIdForUi}`)
				return
			}

			toast.error([
				typedError.messageForUi,
				typedError.detailsForUi,
			].filter(Boolean).join(" ") || getErrorMessage(error, "Could not start retry flow"))
		},
	})

	const exportMutation = useMutation({
		mutationFn: async () => {
			const response = await fetch(`${BASE_URL}/api/v2/sessions/${id}/export?format=csv`, {
				credentials: "include",
			})

			if (!response.ok) {
				let message = `Export failed (${response.status})`
				try {
					const body = await response.json()
					if (body?.message)
						message = body.message
				}
				catch {
					// ignore JSON parse errors
				}
				throw new Error(message)
			}

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = url
			link.download = `${session.name || "session"}-results.csv`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			window.URL.revokeObjectURL(url)
		},
		onSuccess: () => {
			toast.success("Results exported successfully")
		},
		onError: (error) => {
			toast.error(getErrorMessage(error, "Export failed"))
		},
	})

	const defaultRetryValues: Profiling.RetryFormValues = {
		name: session.name,
		jobTitle: session.jobTitle ?? "",
		jobDescription: session.jobDescription,
	}

	const openRetry = (mode: Profiling.RetryMode) => {
		setSelectedRetryMode(mode)
		setRetryDialogOpen(true)
	}

	return (
		<div className="flex flex-col gap-8">
			<Profiling.SessionHeader
				session={session}
				isCompleted={isCompleted}
				isFailed={isFailed}
				isExporting={exportMutation.isPending}
				onBack={() => navigate("/profiling")}
				onExport={() => exportMutation.mutate()}
				onOpenRetry={openRetry}
			/>

			{isRunning && (
				<Profiling.RunningSessionSection
					session={session}
					onRefresh={() => queryClient.invalidateQueries({ queryKey: ["profiling-session", id] })}
				/>
			)}

			{isFailed && <Profiling.FailedSessionSection session={session} onOpenRetry={openRetry} />}

			{isCompleted && (
				<Profiling.CompletedSessionView
					session={session}
					results={results}
					strongMatches={strongMatches}
					manualReviewCount={manualReviewCount}
					averageScore={averageScore}
					isExporting={exportMutation.isPending}
					onExport={() => exportMutation.mutate()}
					onOpenRetry={openRetry}
					onSelectCandidate={setSelectedResultId}
				/>
			)}

			{!isCompleted && files.length > 0 && (
				<Profiling.UploadedDocumentsSection
					files={files.map(file => ({ id: file.id, originalName: file.originalName, size: Number(file.size) }))}
					formatFileSize={formatFileSize}
				/>
			)}

			<Profiling.RetrySessionDialog
				open={retryDialogOpen}
				onOpenChange={setRetryDialogOpen}
				selectedRetryMode={selectedRetryMode}
				onSelectRetryMode={setSelectedRetryMode}
				defaultValues={defaultRetryValues}
				onSubmit={async (values) => {
					await retryMutation.mutateAsync(values)
				}}
				isPending={retryMutation.isPending}
			/>

			<Profiling.CandidateDetailDialog
				sessionId={id}
				resultId={selectedResultId}
				open={Boolean(selectedResultId)}
				onOpenChange={(open) => {
					if (!open)
						setSelectedResultId(null)
				}}
			/>
		</div>
	)
}

export default function ProfilingResultsPage() {
	return (
		<QueryErrorBoundary
			fallback={(
				<RouteErrorFallback
					title="Could not load this profiling session"
					description="The session page is unavailable right now. You can retry this view or head back to your session list."
					secondaryHref="/profiling"
					secondaryLabel="Back to sessions"
				/>
			)}
		>
			<Suspense fallback={<ProfilingSessionSkeleton />}>
				<ProfilingSessionContent />
			</Suspense>
		</QueryErrorBoundary>
	)
}
