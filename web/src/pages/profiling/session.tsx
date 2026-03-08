import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
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
import { formatFileSize } from "@/lib/utils"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

type SessionStatus = "processing" | "retrying" | "completed" | "failed"
type RetryMode = "rerun_current" | "clone_current" | "clone_with_updates" | "replace_with_updates"

type ProfilingSession = {
	id: string
	name: string
	jobTitle: string | null
	jobDescription: string
	status: SessionStatus
	totalFiles: number
	errorMessage: string | null
	createdAt: string | Date
	lastCompletedAt?: string | Date | null
	retryCount?: number
}

type SessionFile = {
	id: number
	originalName: string
	mimeType: string
	size: number
}

type ParsedProfile = {
	name_confidence?: number | null
	parse_warnings?: string[] | null
	total_experience_years?: number | null
	work_history?: Array<{
		title?: string | null
		company?: string | null
		start_date?: string | null
		end_date?: string | null
		description?: string | null
	}> | null
	education?: Array<{
		degree?: string | null
		institution?: string | null
		year?: number | null
	}> | null
	certifications?: string[] | null
	skills?: string[] | null
} | null

type ScoreDetail = {
	score: number
	weight: number
	description: string
	details?: Record<string, unknown>
}

type CandidateResult = {
	rank?: number
	id: string
	runId?: string
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

type CandidateResultDetail = CandidateResult & {
	rawText: string
	scoreBreakdown: Record<string, ScoreDetail>
	mimeType?: string
}

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
		description: "Instantly rerun this same session with the same files and same requirements.",
		buttonLabel: "Retry this session",
		requiresUpdates: false,
		target: "current",
	},
	clone_current: {
		label: "New copy",
		description: "Create a new session using the same resumes and the same role brief.",
		buttonLabel: "Create new copied session",
		requiresUpdates: false,
		target: "new",
	},
	clone_with_updates: {
		label: "Update as new",
		description: "Create a new session with the same resumes after editing the role brief.",
		buttonLabel: "Create updated session",
		requiresUpdates: true,
		target: "new",
	},
	replace_with_updates: {
		label: "Update and replace",
		description: "Edit this session and rerun it in place, replacing the current results.",
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

function getExperienceLabel(candidate: CandidateResult) {
	const years = candidate.parsedProfile?.total_experience_years
	if (typeof years !== "number")
		return null

	return `${years} year${years === 1 ? "" : "s"} experience`
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

function getStatusLabel(status: SessionStatus) {
	switch (status) {
		case "processing":
			return "processing"
		case "retrying":
			return "retrying"
		case "completed":
			return "completed"
		case "failed":
			return "failed"
	}
}

function getPrimarySkills(candidate: CandidateResult) {
	const fromMatched = candidate.skillsMatched ?? []
	if (fromMatched.length > 0)
		return fromMatched.slice(0, 5)

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

export default function ProfilingResultsPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const [session, setSession] = useState<ProfilingSession>()
	const [files, setFiles] = useState<SessionFile[]>([])
	const [results, setResults] = useState<CandidateResult[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isExporting, setIsExporting] = useState(false)
	const [isRetrying, setIsRetrying] = useState(false)
	const [selectedResult, setSelectedResult] = useState<CandidateResultDetail | null>(null)
	const [isDetailOpen, setIsDetailOpen] = useState(false)
	const [isDetailLoading, setIsDetailLoading] = useState(false)
	const [retryDialogOpen, setRetryDialogOpen] = useState(false)
	const [selectedRetryMode, setSelectedRetryMode] = useState<RetryMode>("rerun_current")

	const retryForm = useForm<RetryFormValues>({
		defaultValues: {
			name: "",
			jobTitle: "",
			jobDescription: "",
		},
	})

	const isCompleted = session?.status === "completed"
	const isFailed = session?.status === "failed"
	const isRunning = session?.status === "processing" || session?.status === "retrying"
	const manualReviewCount = useMemo(() => results.filter(needsManualReview).length, [results])
	const strongMatches = useMemo(() => results.filter(candidate => candidate.overallScore >= 80).length, [results])
	const averageScore = useMemo(() => {
		if (results.length === 0)
			return 0

		return Math.round(results.reduce((accumulator, candidate) => accumulator + candidate.overallScore, 0) / results.length)
	}, [results])

	useEffect(() => {
		if (!id)
			return

		void fetchSession(true)
	}, [id])

	useEffect(() => {
		if (!id || !isRunning)
			return

		const timer = window.setInterval(() => {
			void fetchSession(false)
		}, 5000)

		return () => window.clearInterval(timer)
	}, [id, isRunning])

	useEffect(() => {
		if (!session)
			return

		retryForm.reset({
			name: session.name,
			jobTitle: session.jobTitle ?? "",
			jobDescription: session.jobDescription,
		})
	}, [retryForm, session])

	const fetchSession = async (showLoading: boolean) => {
		if (!id)
			return

		if (showLoading)
			setIsLoading(true)

		try {
			const { data, error } = await api.api.v2.sessions({ id }).get()

			if (error || !data) {
				const message = getEdenErrorMessage(error)
				if (showLoading)
					toast.error(message ?? "Could not load profiling session")

				if (error?.status === 404)
					navigate("/dashboard")

				return
			}

			setSession(data.session as ProfilingSession)
			setFiles(data.files || [])

			if (data.session.status === "completed" && data.results) {
				const rankedResults = (data.results as CandidateResult[]).map((candidate, index) => ({
					...candidate,
					overallScore: Number(candidate.overallScore),
					rank: index + 1,
				}))
				setResults(rankedResults)
			}
			else {
				setResults([])
				setSelectedResult(null)
			}
		}
		catch (error) {
			if (showLoading)
				toast.error(getErrorMessage(error, "Failed to load profiling session"))
			console.error("[ProfilingSession] Fetch error:", error)
		}
		finally {
			if (showLoading)
				setIsLoading(false)
		}
	}

	const exportResults = async () => {
		if (!id)
			return

		setIsExporting(true)
		try {
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
					// ignore JSON parse failures
				}
				throw new Error(message)
			}

			const blob = await response.blob()
			const url = window.URL.createObjectURL(blob)
			const link = document.createElement("a")
			link.href = url
			link.download = `${session?.name || "session"}-results.csv`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			window.URL.revokeObjectURL(url)

			toast.success("Results exported successfully")
		}
		catch (error) {
			toast.error(getErrorMessage(error, "Export failed"))
			console.error("[ProfilingSession] Export error:", error)
		}
		finally {
			setIsExporting(false)
		}
	}

	const openCandidateDetail = async (candidate: CandidateResult) => {
		if (!id)
			return

		setIsDetailOpen(true)
		setIsDetailLoading(true)

		try {
			const { data, error } = await api.api.v2.sessions({ id }).results({ resultId: candidate.id }).get()
			if (error || !data?.result)
				throw new Error(getEdenErrorMessage(error) ?? "Could not load candidate details")

			setSelectedResult({
				...data.result,
				overallScore: Number(data.result.overallScore),
			} as CandidateResultDetail)
		}
		catch (error) {
			toast.error(getErrorMessage(error, "Failed to load candidate details"))
			setIsDetailOpen(false)
		}
		finally {
			setIsDetailLoading(false)
		}
	}

	const selectedRetryCopy = retryModeCopy[selectedRetryMode]

	const openRetryDialog = (mode: RetryMode) => {
		setSelectedRetryMode(mode)
		setRetryDialogOpen(true)
	}

	const submitRetry = retryForm.handleSubmit(async (values) => {
		if (!id)
			return

		setIsRetrying(true)
		try {
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

			toast.success(selectedRetryCopy.target === "current"
				? "Retry started on this session"
				: "A new session has been created")
			setRetryDialogOpen(false)

			const targetSessionId = data.targetSessionId ?? data.sessionId
			if (targetSessionId && targetSessionId !== id) {
				navigate(`/profiling/${targetSessionId}`)
				return
			}

			await fetchSession(false)
		}
		catch (error) {
			toast.error(getErrorMessage(error, "Could not start retry flow"))
		}
		finally {
			setIsRetrying(false)
		}
	})

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] flex-col items-center justify-center">
				<Loader2 className="mb-4 size-10 animate-spin text-primary" />
				<p className="text-muted-foreground">Loading profiling session...</p>
			</div>
		)
	}

	if (!session)
		return null

	return (
		<div className="flex flex-col gap-8">
			<section className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant={statusBadgeVariant(session.status)} className="text-xs uppercase tracking-widest">
						{getStatusLabel(session.status)}
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
					<p className="ml-10 text-sm text-muted-foreground">
						Session ID {session.id.substring(0, 8)} • {session.jobTitle || "Custom role brief"}
					</p>
					<p className="ml-10 max-w-4xl text-sm text-muted-foreground line-clamp-2">
						{session.jobDescription}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{isCompleted && (
						<Button size="sm" className="gap-2" onClick={exportResults} disabled={isExporting}>
							{isExporting ? <Loader2 className="size-4 animate-spin" /> : "Export results"}
							<Download className="size-4" />
						</Button>
					)}
					{isFailed && (
						<Button size="sm" variant="secondary" className="gap-2" onClick={() => openRetryDialog("rerun_current")}>
							<RefreshCw className="size-4" />
							Retry now
						</Button>
					)}
					{isCompleted && (
						<Button size="sm" variant="outline" className="gap-2" onClick={() => openRetryDialog("clone_current")}>
							<RotateCcw className="size-4" />
							Retry options
						</Button>
					)}
				</div>
			</section>

			{isRunning && (
				<section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
					<div className="mb-6 flex size-16 items-center justify-center rounded-full bg-sky-500/10">
						<Loader2 className="size-8 animate-spin text-sky-500" />
					</div>
					<h2 className="mb-2 text-2xl font-semibold tracking-tight">
						{session.status === "retrying" ? "Refreshing this session" : "Profiling in progress"}
					</h2>
					<p className="mb-4 text-muted-foreground">
						Working through {session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""}. This page refreshes automatically.
					</p>
					<Button size="sm" variant="outline" className="gap-2" onClick={() => void fetchSession(false)}>
						<RefreshCw className="size-4" />
						Refresh now
					</Button>
				</section>
			)}

			{isFailed && (
				<section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
					<div className="mb-5 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
						<TriangleAlert className="size-8" />
					</div>
					<h2 className="mb-2 text-2xl font-semibold tracking-tight">Profiling stopped before completion</h2>
					<p className="mb-6 max-w-lg text-muted-foreground">
						You can retry this same session instantly with the existing resumes, or start a fresh copy if you want to preserve this failed attempt.
					</p>
					<div className="flex flex-wrap items-center justify-center gap-3">
						<Button className="gap-2" onClick={() => openRetryDialog("rerun_current")}>
							<RefreshCw className="size-4" />
							Retry now
						</Button>
						<Button variant="outline" className="gap-2" onClick={() => openRetryDialog("clone_current")}>
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
								<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
									Session overview
								</CardTitle>
								<CardDescription className="mt-1 text-sm">
									A recruiter-friendly snapshot of this candidate batch.
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
										<p>{strongMatches > 0 ? `${strongMatches} candidates stand out as strong matches for the role.` : "No candidates crossed the strong-match threshold yet."}</p>
									</div>
									<div className="flex items-start gap-3">
										<Sparkles className="mt-0.5 size-4 text-primary" />
										<p>{manualReviewCount > 0 ? `${manualReviewCount} candidate${manualReviewCount === 1 ? " needs" : "s need"} a quick manual review for extracted details.` : "No manual review flags were raised in this run."}</p>
									</div>
								</div>
							</CardContent>
						</Card>

						<Card className="border-none shadow-x">
							<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
								<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
									Next actions
								</CardTitle>
								<CardDescription className="mt-1 text-sm">
									Choose whether to keep this run, duplicate it, or replace it with a refreshed version.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
								<ActionCard title="Retry now" description="Rerun this exact session in place." onClick={() => openRetryDialog("rerun_current")} />
								<ActionCard title="New copy" description="Create a new session using the same files and current brief." onClick={() => openRetryDialog("clone_current")} />
								<ActionCard title="Update as new" description="Edit the brief and create a new follow-up session." onClick={() => openRetryDialog("clone_with_updates")} />
								<ActionCard title="Update and replace" description="Edit this session and rerun it in place." onClick={() => openRetryDialog("replace_with_updates")} />
							</CardContent>
						</Card>
					</section>

					<section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
						<Card className="xl:col-span-2 border-border/60 shadow-m dark:border-border/40">
							<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4 dark:border-border/30">
								<div>
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
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
												<TableCell colSpan={3} className="h-32 text-center text-muted-foreground">
													No results generated for this session.
												</TableCell>
											</TableRow>
										) : (
											results.map((candidate) => (
												<TableRow
													key={candidate.id}
													className="group cursor-pointer align-top transition-all hover:bg-muted/55"
													onClick={() => void openCandidateDetail(candidate)}
												>
													<TableCell>
														<Badge variant="secondary" className="text-xs shadow-sm">#{candidate.rank}</Badge>
													</TableCell>
													<TableCell className="space-y-1">
														<p className="font-semibold text-foreground transition-colors group-hover:text-primary">
															{getDisplayCandidateName(candidate)}
														</p>
														<p className="text-xs text-muted-foreground">Match score {candidate.overallScore}/100{getExperienceLabel(candidate) ? ` • ${getExperienceLabel(candidate)}` : ""}</p>
														<p className="text-xs text-muted-foreground" title={candidate.originalName}>Resume: {candidate.originalName}</p>
														{candidate.candidateEmail && (
															<p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Mail className="size-3" />{candidate.candidateEmail}</p>
														)}
														{needsManualReview(candidate) && <p className="text-[11px] text-amber-600">{getManualReviewLabel(candidate)}</p>}
													</TableCell>
													<TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
														<p className="line-clamp-2 leading-snug">{candidate.summary}</p>
														<div className="mt-2 flex flex-wrap gap-1.5">
															{getPrimarySkills(candidate).map((skill) => (
																<span key={skill} className="rounded-sm bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
																	{skill}
																</span>
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
								<Button size="sm" variant="secondary" onClick={exportResults} disabled={isExporting}>Download CSV</Button>
							</CardFooter>
						</Card>

						{results.length > 0 && (
							<Card className="border-none shadow-m">
								<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
										Top candidates
									</CardTitle>
									<CardDescription className="mt-1 text-sm">
										Quick access to the most relevant profiles from this run.
									</CardDescription>
								</CardHeader>
								<CardContent className="space-y-3 pt-6 text-sm text-muted-foreground">
									{results.slice(0, 3).map((candidate) => (
										<div
											key={candidate.id}
											className="cursor-pointer rounded-lg bg-muted/30 p-4 shadow-x transition-all hover:-translate-y-0.5 dark:bg-muted/20"
											onClick={() => void openCandidateDetail(candidate)}
										>
											<p className="text-sm font-semibold text-foreground">{getDisplayCandidateName(candidate)}</p>
											<p className="mt-1 text-xs">Match score {candidate.overallScore}/100 • Rank #{candidate.rank}</p>
											<p className="mt-3 line-clamp-3 text-xs leading-relaxed text-muted-foreground">{candidate.summary}</p>
											<Button size="sm" variant="ghost" className="mt-4 gap-2">
												View details
												<ArrowUpRight className="size-4" />
											</Button>
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
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Uploaded documents
							</CardTitle>
							<CardDescription className="mt-1 text-sm">
								{files.length} resume{files.length !== 1 ? "s" : ""} reusable for retry or rerun flows
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{files.map((file) => (
									<div key={file.id} className="rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 dark:bg-muted/20">
										<div className="flex items-center gap-3.5">
											<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
												<FileText className="size-5 text-primary/80" />
											</div>
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
							<Button type="button" variant="ghost" onClick={() => setRetryDialogOpen(false)} disabled={isRetrying}>Cancel</Button>
							<Button type="submit" className="gap-2" disabled={isRetrying}>
								{isRetrying ? <Loader2 className="size-4 animate-spin" /> : null}
								{selectedRetryCopy.buttonLabel}
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

			<Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
				<DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>{selectedResult ? getDisplayCandidateName(selectedResult) : "Candidate detail"}</DialogTitle>
						<DialogDescription>
							{selectedResult?.originalName ?? "Open a candidate to inspect their profile."}
						</DialogDescription>
					</DialogHeader>

					{isDetailLoading ? (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<Loader2 className="size-4 animate-spin" /> Loading candidate detail...
						</div>
					) : selectedResult ? (
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
					) : null}
				</DialogContent>
			</Dialog>
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
