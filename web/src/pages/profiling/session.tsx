import { Suspense, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useNavigate, useParams } from "react-router-dom"
import {
	ArrowLeft,
	ArrowUpRight,
	Download,
	FileText,
	Loader2,
	Mail,
	Phone,
	RefreshCw,
	RotateCcw,
	Sparkles,
	TriangleAlert,
	UserRound,
} from "lucide-react"
import { toast } from "sonner"

import { api } from "@/lib/api"
import { BASE_URL } from "@/lib/constants"
import { getEdenErrorMessage, getErrorMessage } from "@/lib/errors"
import {
	candidateDetailQueryOptions,
	type CandidateResult,
	type CandidateResultDetail,
	type ParsedProfile,
	profilingSessionQueryOptions,
	type SessionStatus,
} from "@/lib/profiling-queries"
import { formatFileSize } from "@/lib/utils"
import { QueryErrorBoundary } from "@/components/feedback/query-error-boundary"
import { RouteErrorFallback } from "@/components/feedback/route-error-fallback"
import { ProfilingSessionSkeleton } from "@/components/feedback/route-skeletons"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type RetryMode = "rerun_current" | "clone_current" | "clone_with_updates" | "replace_with_updates"

type RetryFormValues = {
	name: string
	jobTitle: string
	jobDescription: string
}

const retryModeCopy: Record<RetryMode, {
	label: string
	description: string
	buttonLabel: string
	requiresUpdates: boolean
	target: "current" | "new"
}> = {
	rerun_current: {
		label: "Retry now",
		description: "Rerun this exact session in place with the same resumes and the same screening brief.",
		buttonLabel: "Retry this session",
		requiresUpdates: false,
		target: "current",
	},
	clone_current: {
		label: "New copy",
		description: "Create a new session using the same resumes and current brief while keeping this one intact.",
		buttonLabel: "Create new copied session",
		requiresUpdates: false,
		target: "new",
	},
	clone_with_updates: {
		label: "Update as new",
		description: "Edit the brief, then create a new follow-up session with the same resumes.",
		buttonLabel: "Create updated session",
		requiresUpdates: true,
		target: "new",
	},
	replace_with_updates: {
		label: "Update and replace",
		description: "Edit this session and rerun it in place, replacing the current result set.",
		buttonLabel: "Update and rerun",
		requiresUpdates: true,
		target: "current",
	},
}

function getDisplayCandidateName(candidate: CandidateResult) {
	const confidence = Number(candidate.parsedProfile?.name_confidence ?? 0)
	if (candidate.candidateName && confidence >= 0.5)
		return candidate.candidateName

	return candidate.originalName
}

function needsManualReview(candidate: CandidateResult) {
	return (candidate.parsedProfile?.parse_warnings?.length ?? 0) > 0
}

function getManualReviewLabel(candidate: CandidateResult) {
	const warnings = new Set(candidate.parsedProfile?.parse_warnings ?? [])
	if (warnings.has("name_missing_or_invalid"))
		return "Please verify the candidate name manually"
	if (warnings.has("work_history_not_confident"))
		return "Please double-check work history and experience"
	if (warnings.has("skills_not_confident"))
		return "Please confirm key skills from the resume"
	return "A manual review is recommended"
}

function getExperienceLabel(candidate: { parsedProfile?: ParsedProfile }) {
	const years = candidate.parsedProfile?.total_experience_years
	if (typeof years !== "number")
		return null

	return `${years} year${years === 1 ? "" : "s"} experience`
}

function getPrimarySkills(candidate: CandidateResult) {
	const matched = candidate.skillsMatched ?? []
	if (matched.length > 0)
		return matched.slice(0, 5)

	return (candidate.parsedProfile?.skills ?? []).slice(0, 5)
}

function getMissingSkills(detail: CandidateResultDetail) {
	const skillMatch = detail.scoreBreakdown?.skill_match
	const missing = skillMatch?.details?.missing
	return Array.isArray(missing) ? missing.filter(item => typeof item === "string") as string[] : []
}

function getRecentRoles(detail: CandidateResultDetail) {
	return (detail.parsedProfile?.work_history ?? []).slice(0, 3)
}

function getEducationLines(detail: CandidateResultDetail) {
	return (detail.parsedProfile?.education ?? []).map((entry) => {
		return [entry.degree, entry.institution, entry.year].filter(Boolean).join(" • ")
	}).filter(Boolean)
}

function statusBadgeVariant(status: SessionStatus) {
	switch (status) {
		case "processing":
		case "retrying":
			return "secondary"
		case "completed":
			return "default"
		case "failed":
			return "destructive"
	}
}

function statusLabel(status: SessionStatus) {
	switch (status) {
		case "processing":
			return "queued"
		case "retrying":
			return "refreshing"
		case "completed":
			return "completed"
		case "failed":
			return "needs attention"
	}
}

function SummaryTile({ label, value, subtext }: {
	label: string
	value: string | number
	subtext: string
}) {
	return (
		<div className="grid rounded-xl bg-muted/55 py-4 pl-3 pr-5 shadow-m transition-all hover:-translate-y-0.5">
			<p className="text-xs uppercase tracking-tight text-muted-foreground">{label}</p>
			<p className="mt-2 bg-linear-to-br from-foreground to-foreground/80 bg-clip-text text-2xl font-bold text-foreground">{value}</p>
			<p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
		</div>
	)
}

function ActionCard({ title, description, onClick }: {
	title: string
	description: string
	onClick: () => void
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full rounded-lg border border-border/50 bg-muted/20 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
		>
			<p className="font-medium text-foreground">{title}</p>
			<p className="mt-2 text-sm text-muted-foreground">{description}</p>
		</button>
	)
}

function CandidateDetailFallback() {
	return (
		<div className="space-y-6">
			<div className="grid gap-3 sm:grid-cols-3">
				{Array.from({ length: 3 }).map((_, index) => (
					<Skeleton key={index} className="h-24 w-full rounded-xl" />
				))}
			</div>
			<Skeleton className="h-28 w-full rounded-xl" />
			<div className="grid gap-4 lg:grid-cols-2">
				<Skeleton className="h-44 w-full rounded-xl" />
				<Skeleton className="h-44 w-full rounded-xl" />
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				<Skeleton className="h-52 w-full rounded-xl" />
				<Skeleton className="h-52 w-full rounded-xl" />
			</div>
		</div>
	)
}

function CandidateDetailContent({ sessionId, resultId }: { sessionId: string; resultId: string }) {
	const { data: selectedResult } = useSuspenseQuery(candidateDetailQueryOptions(sessionId, resultId))

	return (
		<div className="space-y-6 text-sm">
			<div className="grid gap-3 sm:grid-cols-3">
				<SummaryTile label="Match score" value={`${selectedResult.overallScore}/100`} subtext="Overall fit for this role" />
				<SummaryTile label="Experience" value={getExperienceLabel(selectedResult) ?? "Unknown"} subtext="Estimated from resume history" />
				<SummaryTile label="Review status" value={needsManualReview(selectedResult) ? "Needs review" : "Ready"} subtext={needsManualReview(selectedResult) ? getManualReviewLabel(selectedResult) : "No manual issues flagged"} />
			</div>

			<div className="rounded-xl bg-muted/40 p-4">
				<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
				<p className="mt-2 leading-6 text-foreground">{selectedResult.summary}</p>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="rounded-xl border p-4">
					<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Contact</p>
					<div className="mt-3 space-y-2 text-sm text-muted-foreground">
						<p className="flex items-center gap-2 text-foreground"><UserRound className="size-4 text-primary" />{getDisplayCandidateName(selectedResult)}</p>
						<p className="text-xs">Resume file: {selectedResult.originalName}</p>
						{selectedResult.candidateEmail && <p className="flex items-center gap-2"><Mail className="size-4" />{selectedResult.candidateEmail}</p>}
						{selectedResult.candidatePhone && <p className="flex items-center gap-2"><Phone className="size-4" />{selectedResult.candidatePhone}</p>}
					</div>
				</div>

				<div className="rounded-xl border p-4">
					<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Skills snapshot</p>
					<div className="mt-3 flex flex-wrap gap-2">
						{getPrimarySkills(selectedResult).length > 0 ? getPrimarySkills(selectedResult).map((skill) => (
							<Badge key={skill} variant="outline">{skill}</Badge>
						)) : <span className="text-sm text-muted-foreground">No clear skills extracted</span>}
					</div>
					{getMissingSkills(selectedResult).length > 0 && (
						<div className="mt-4">
							<p className="text-xs font-medium text-foreground">Skills to confirm manually</p>
							<div className="mt-2 flex flex-wrap gap-2">
								{getMissingSkills(selectedResult).map((skill) => (
									<Badge key={skill} variant="secondary">{skill}</Badge>
								))}
							</div>
						</div>
					)}
				</div>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<div className="rounded-xl border p-4">
					<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recent experience</p>
					<div className="mt-3 space-y-3">
						{getRecentRoles(selectedResult).length > 0 ? getRecentRoles(selectedResult).map((role, index) => (
							<div key={`${role.title}-${role.company}-${index}`} className="rounded-lg bg-muted/30 p-3">
								<p className="font-medium text-foreground">{role.title || "Role not extracted"}</p>
								<p className="text-xs text-muted-foreground">{[role.company, role.start_date, role.end_date].filter(Boolean).join(" • ") || "Dates not available"}</p>
								{role.description && <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">{role.description}</p>}
							</div>
						)) : <span className="text-sm text-muted-foreground">No work history could be structured from this resume.</span>}
					</div>
				</div>

				<div className="rounded-xl border p-4">
					<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Education and credentials</p>
					<div className="mt-3 space-y-3 text-sm text-muted-foreground">
						{getEducationLines(selectedResult).length > 0 && (
							<div>
								<p className="font-medium text-foreground">Education</p>
								<div className="mt-2 space-y-1">{getEducationLines(selectedResult).map((line) => <p key={line}>{line}</p>)}</div>
							</div>
						)}
						{(selectedResult.parsedProfile?.certifications ?? []).length > 0 && (
							<div>
								<p className="font-medium text-foreground">Certifications</p>
								<div className="mt-2 flex flex-wrap gap-2">
									{(selectedResult.parsedProfile?.certifications ?? []).map((item) => (
										<Badge key={item} variant="outline">{item}</Badge>
									))}
								</div>
							</div>
						)}
						{getEducationLines(selectedResult).length === 0 && (selectedResult.parsedProfile?.certifications ?? []).length === 0 && (
							<span>No structured education or certifications were extracted.</span>
						)}
					</div>
				</div>
			</div>

			{needsManualReview(selectedResult) && (
				<div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
					<p className="text-xs uppercase tracking-[0.18em] text-amber-700">Review notes</p>
					<p className="mt-2 text-sm text-foreground">{getManualReviewLabel(selectedResult)}</p>
				</div>
			)}
		</div>
	)
}

function CandidateDetailDialog(args: {
	sessionId: string
	resultId: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
}) {
	const { sessionId, resultId, open, onOpenChange } = args

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Candidate detail</DialogTitle>
					<DialogDescription>
						Review the candidate summary, experience, and contact details.
					</DialogDescription>
				</DialogHeader>

				{resultId ? (
					<QueryErrorBoundary
						fallback={(
							<RouteErrorFallback
								title="Could not load candidate detail"
								description="This candidate card is temporarily unavailable. You can retry the dialog or return to the session list."
								secondaryHref="/profiling"
								secondaryLabel="Back to sessions"
							/>
						)}
					>
						<Suspense fallback={<CandidateDetailFallback />}>
							<CandidateDetailContent sessionId={sessionId} resultId={resultId} />
						</Suspense>
					</QueryErrorBoundary>
				) : null}
			</DialogContent>
		</Dialog>
	)
}

function ProfilingSessionContent() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const [retryDialogOpen, setRetryDialogOpen] = useState(false)
	const [selectedRetryMode, setSelectedRetryMode] = useState<RetryMode>("rerun_current")
	const [selectedResultId, setSelectedResultId] = useState<string | null>(null)

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
	const manualReviewCount = useMemo(() => results.filter(needsManualReview).length, [results])
	const strongMatches = useMemo(() => results.filter(candidate => candidate.overallScore >= 80).length, [results])
	const averageScore = useMemo(() => {
		if (results.length === 0)
			return 0

		return Math.round(results.reduce((accumulator, candidate) => accumulator + candidate.overallScore, 0) / results.length)
	}, [results])

	const retryForm = useForm<RetryFormValues>({
		values: {
			name: session.name,
			jobTitle: session.jobTitle ?? "",
			jobDescription: session.jobDescription,
		},
	})

	const selectedRetryCopy = retryModeCopy[selectedRetryMode]

	const retryMutation = useMutation({
		mutationFn: async (values: RetryFormValues) => {
			const payload = selectedRetryCopy.requiresUpdates
				? {
					mode: selectedRetryMode,
					name: values.name.trim(),
					jobTitle: values.jobTitle.trim() || undefined,
					jobDescription: values.jobDescription.trim(),
				}
				: { mode: selectedRetryMode }

			const { data, error } = await api.api.v2.sessions({ id }).retry.post(payload)
			if (error || !data)
				throw new Error(getEdenErrorMessage(error) ?? "Could not start retry flow")

			return data
		},
		onSuccess: async (response) => {
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
			toast.error(getErrorMessage(error, "Could not start retry flow"))
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

	const submitRetry = retryForm.handleSubmit(async (values) => {
		await retryMutation.mutateAsync(values)
	})

	return (
		<div className="flex flex-col gap-8">
			<section className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant={statusBadgeVariant(session.status)} className="text-xs uppercase tracking-widest">
						{statusLabel(session.status)}
					</Badge>
					<p className="text-sm text-muted-foreground">
						{session.lastCompletedAt
							? `Last completed ${new Date(session.lastCompletedAt).toLocaleDateString()}`
							: `Created ${new Date(session.createdAt).toLocaleDateString()}`}
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" className="-ml-2 mr-1 size-8 shrink-0" onClick={() => navigate("/profiling")}>
							<ArrowLeft className="size-5" />
						</Button>
						<h1 className="head-text-md text-foreground">{session.name}</h1>
					</div>
					<p className="ml-10 text-sm text-muted-foreground">Session ID {session.id.substring(0, 8)} • {session.jobTitle || "Custom role brief"}</p>
					<p className="ml-10 max-w-4xl text-sm text-muted-foreground line-clamp-2">{session.jobDescription}</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{isCompleted && (
						<Button size="sm" className="gap-2" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>
							{exportMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Export results"}
							<Download className="size-4" />
						</Button>
					)}
					{isFailed && (
						<Button size="sm" variant="secondary" className="gap-2" onClick={() => {
							setSelectedRetryMode("rerun_current")
							setRetryDialogOpen(true)
						}}>
							<RefreshCw className="size-4" />
							Retry now
						</Button>
					)}
					{isCompleted && (
						<Button size="sm" variant="outline" className="gap-2" onClick={() => {
							setSelectedRetryMode("clone_current")
							setRetryDialogOpen(true)
						}}>
							<RotateCcw className="size-4" />
							Retry options
						</Button>
					)}
				</div>
			</section>

			{isRunning && (
				<section className="mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-xl border bg-card p-8 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="space-y-2">
							<Badge variant="secondary" className="w-fit">
								{session.status === "retrying" ? "Refreshing in background" : "Running in background"}
							</Badge>
							<h2 className="text-2xl font-semibold tracking-tight">
								{session.status === "retrying" ? "This session is being refreshed" : "This session is still scoring"}
							</h2>
							<p className="max-w-2xl text-muted-foreground">
								You do not need to wait here. The screening job keeps running even if you leave this page, and this view refreshes quietly in the background.
							</p>
						</div>
						<Button size="sm" variant="outline" className="gap-2" onClick={() => queryClient.invalidateQueries({ queryKey: ["profiling-session", id] })}>
							<RefreshCw className="size-4" />
							Check again
						</Button>
					</div>

					<div className="grid gap-4 sm:grid-cols-3">
						<SummaryTile label="Files in queue" value={session.totalFiles} subtext="Resumes included in this run" />
						<SummaryTile label="Session mode" value={session.status === "retrying" ? "Refresh" : "New run"} subtext="Current background job" />
						<SummaryTile label="What to expect" value="Auto refresh" subtext="This page updates every few seconds" />
					</div>
				</section>
			)}

			{isFailed && (
				<section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
					<div className="mb-5 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
						<TriangleAlert className="size-8" />
					</div>
					<h2 className="mb-2 text-2xl font-semibold tracking-tight">Screening stopped before completion</h2>
					<p className="mb-6 max-w-lg text-muted-foreground">
						You can retry this session instantly with the same resumes, or create a separate follow-up session if you want to preserve this attempt.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Button className="gap-2" onClick={() => {
							setSelectedRetryMode("rerun_current")
							setRetryDialogOpen(true)
						}}>
							<RefreshCw className="size-4" />
							Retry now
						</Button>
						<Button variant="outline" className="gap-2" onClick={() => {
							setSelectedRetryMode("clone_current")
							setRetryDialogOpen(true)
						}}>
							<RotateCcw className="size-4" />
							Create new copy
						</Button>
					</div>
					{session.errorMessage && (
						<div className="mt-6 max-w-2xl rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-left text-sm text-muted-foreground">
							<p className="font-medium text-foreground">Technical details</p>
							<p className="mt-1 break-words">{session.errorMessage}</p>
						</div>
					)}
				</section>
			)}

			{isCompleted && (
				<>
					<section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
						<Card className="h-full border-none shadow-x">
							<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
								<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">
									Session overview
								</CardTitle>
								<CardDescription className="mt-1 text-sm">
									A recruiter-friendly snapshot of the latest completed run.
								</CardDescription>
							</CardHeader>
							<CardContent className="px-4">
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
									<SummaryTile label="Candidates reviewed" value={session.totalFiles} subtext="Resumes processed" />
									<SummaryTile label="Strong matches" value={strongMatches} subtext="Match score 80+" />
									<SummaryTile label="Needs review" value={manualReviewCount} subtext="Manual follow-up recommended" />
									<SummaryTile label="Average match" value={`${averageScore}/100`} subtext="Across the current run" />
								</div>
								<div className="mt-6 space-y-3 text-sm text-muted-foreground">
									<div className="flex items-start gap-3">
										<Sparkles className="mt-0.5 size-4 text-primary" />
										<p>{strongMatches > 0 ? `${strongMatches} candidates stand out as strong matches for this brief.` : "No candidates crossed the strong-match threshold yet."}</p>
									</div>
									<div className="flex items-start gap-3">
										<Sparkles className="mt-0.5 size-4 text-primary" />
										<p>{manualReviewCount > 0 ? `${manualReviewCount} candidate${manualReviewCount === 1 ? " needs" : "s need"} a quick manual check for extracted details.` : "No manual review flags were raised in this run."}</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-none shadow-x">
							<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
								<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">
									Next actions
								</CardTitle>
								<CardDescription className="mt-1 text-sm">
									Choose whether to keep this run, duplicate it, or replace it with a refreshed version.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
								<ActionCard title="Retry now" description="Rerun this exact session in place." onClick={() => {
									setSelectedRetryMode("rerun_current")
									setRetryDialogOpen(true)
								}} />
								<ActionCard title="New copy" description="Create a new session using the same files and current brief." onClick={() => {
									setSelectedRetryMode("clone_current")
									setRetryDialogOpen(true)
								}} />
								<ActionCard title="Update as new" description="Edit the brief and create a new follow-up session." onClick={() => {
									setSelectedRetryMode("clone_with_updates")
									setRetryDialogOpen(true)
								}} />
								<ActionCard title="Update and replace" description="Edit this session and rerun it in place." onClick={() => {
									setSelectedRetryMode("replace_with_updates")
									setRetryDialogOpen(true)
								}} />
							</CardContent>
						</Card>
					</section>

					<section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
						<Card className="xl:col-span-2 border-border/60 shadow-m dark:border-border/40">
							<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4 dark:border-border/30">
								<div>
									<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">
										Ranked candidates
									</CardTitle>
									<CardDescription className="mt-1 text-sm">
										Open a candidate to inspect experience, strengths, and contact details.
									</CardDescription>
								</div>
								<Badge variant="outline">{manualReviewCount > 0 ? `${manualReviewCount} need review` : "Ready to shortlist"}</Badge>
							</CardHeader>
							<CardContent className="space-y-4">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Rank</TableHead>
											<TableHead>Candidate</TableHead>
											<TableHead className="hidden sm:table-cell">Highlights</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{results.length === 0 ? (
											<TableRow>
												<TableCell colSpan={3} className="h-32 text-center text-muted-foreground">No results generated for this session.</TableCell>
											</TableRow>
										) : (
											results.map((candidate) => (
												<TableRow
													key={candidate.id}
													className="group cursor-pointer align-top transition-all hover:bg-muted/55"
													onClick={() => setSelectedResultId(candidate.id)}
												>
													<TableCell>
														<Badge variant="secondary" className="text-xs shadow-sm">#{candidate.rank}</Badge>
													</TableCell>
													<TableCell className="space-y-1">
														<p className="font-semibold text-foreground transition-colors group-hover:text-primary">{getDisplayCandidateName(candidate)}</p>
														<p className="text-xs text-muted-foreground">Match score {candidate.overallScore}/100{getExperienceLabel(candidate) ? ` • ${getExperienceLabel(candidate)}` : ""}</p>
														<p className="text-xs text-muted-foreground" title={candidate.originalName}>Resume: {candidate.originalName}</p>
														{candidate.candidateEmail && <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3" />{candidate.candidateEmail}</p>}
														{needsManualReview(candidate) && <p className="text-[11px] text-amber-600">{getManualReviewLabel(candidate)}</p>}
													</TableCell>
													<TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
														<p className="line-clamp-2 leading-snug">{candidate.summary}</p>
														<div className="mt-2 flex flex-wrap gap-1.5">
															{getPrimarySkills(candidate).map((skill) => (
																<span key={skill} className="rounded-sm bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{skill}</span>
															))}
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>
							<CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 py-4 text-xs text-muted-foreground">
								<span>Use the export if you want to share or continue screening elsewhere.</span>
								<Button size="sm" variant="secondary" onClick={() => exportMutation.mutate()} disabled={exportMutation.isPending}>Download CSV</Button>
							</CardFooter>
						</Card>

						{results.length > 0 && (
							<Card className="border-none shadow-m">
								<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
									<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">Top candidates</CardTitle>
									<CardDescription className="mt-1 text-sm">Quick access to the strongest profiles from this completed run.</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
									{results.slice(0, 3).map((candidate) => (
										<div
											key={candidate.id}
											className="cursor-pointer rounded-lg bg-muted/30 p-4 shadow-x transition-all hover:-translate-y-0.5 dark:bg-muted/20"
											onClick={() => setSelectedResultId(candidate.id)}
										>
											<p className="text-sm font-semibold text-foreground">{getDisplayCandidateName(candidate)}</p>
											<p className="mt-1 text-xs">Match score {candidate.overallScore}/100 • Rank #{candidate.rank}</p>
											<p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{candidate.summary}</p>
											<Button size="sm" variant="ghost" className="mt-4 gap-2">View details<ArrowUpRight className="size-4" /></Button>
										</div>
									))}
								</CardContent>
							</Card>
						)}
					</section>
				</>
			)}

			{!isCompleted && files.length > 0 && (
				<section>
					<Card className="overflow-hidden border-border/60 shadow-m dark:border-border/40">
						<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
							<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">Uploaded documents</CardTitle>
							<CardDescription className="mt-1 text-sm">{files.length} resume{files.length !== 1 ? "s" : ""} reusable for retry or rerun flows</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{files.map((file) => (
									<div key={file.id} className="rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 dark:bg-muted/20">
										<div className="flex items-center gap-3.5">
											<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><FileText className="size-5 text-primary/80" /></div>
											<div className="min-w-0">
												<p className="truncate text-sm font-medium text-foreground" title={file.originalName}>{file.originalName}</p>
												<p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(Number(file.size))}</p>
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</section>
			)}

			<Dialog open={retryDialogOpen} onOpenChange={setRetryDialogOpen}>
				<DialogContent className="max-w-3xl">
					<DialogHeader>
						<DialogTitle>Retry or recreate this session</DialogTitle>
						<DialogDescription>
							Choose whether to rerun the current session or create a new one using the same resumes.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 md:grid-cols-2">
						{(Object.entries(retryModeCopy) as Array<[RetryMode, typeof retryModeCopy[RetryMode]]>).map(([mode, copy]) => (
							<button
								key={mode}
								type="button"
								onClick={() => setSelectedRetryMode(mode)}
								className={`rounded-xl border p-4 text-left transition-all ${selectedRetryMode === mode ? "border-primary bg-primary/5 shadow-m" : "border-border/60 bg-muted/20 hover:border-primary/30"}`}
							>
								<p className="font-medium text-foreground">{copy.label}</p>
								<p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
							</button>
						))}
					</div>

					<form className="space-y-4" onSubmit={submitRetry}>
						{selectedRetryCopy.requiresUpdates && (
							<div className="grid gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
								<div className="grid gap-2">
									<label className="text-sm font-medium text-foreground" htmlFor="retry-name">Session name</label>
									<Input id="retry-name" {...retryForm.register("name", { required: true })} />
								</div>
								<div className="grid gap-2">
									<label className="text-sm font-medium text-foreground" htmlFor="retry-title">Job title</label>
									<Input id="retry-title" {...retryForm.register("jobTitle")} />
								</div>
								<div className="grid gap-2">
									<label className="text-sm font-medium text-foreground" htmlFor="retry-description">Job description</label>
									<Textarea id="retry-description" className="min-h-[180px] resize-none" {...retryForm.register("jobDescription", { required: true })} />
								</div>
							</div>
						)}

						<div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
							<p className="font-medium text-foreground">Selected action</p>
							<p className="mt-1">{selectedRetryCopy.description}</p>
						</div>

						<DialogFooter>
							<Button type="button" variant="ghost" onClick={() => setRetryDialogOpen(false)} disabled={retryMutation.isPending}>Cancel</Button>
							<Button type="submit" className="gap-2" disabled={retryMutation.isPending}>
								{retryMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
								{selectedRetryCopy.buttonLabel}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<CandidateDetailDialog
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
