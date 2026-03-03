import { toast } from "sonner"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
	ArrowLeft,
	ArrowUpRight,
	BarChart3,
	Download,
	Filter,
	FileText,
	Loader2,
	Mail,
	ThumbsUp,
} from "lucide-react"

import { api } from "@/lib/api"
import { formatFileSize } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card"

type ProfilingSession = {
	id: string
	name: string
	jobTitle: string | null
	jobDescription: string
	status: "processing" | "completed" | "failed"
	totalFiles: number
	errorMessage: string | null
	createdAt: Date
}

type SessionFile = {
	id: number
	originalName: string
	mimeType: string
	size: number
}

type CandidateResult = {
	rank?: number
	id: string
	candidateName: string | null
	candidateEmail: string | null
	candidatePhone: string | null
	overallScore: number
	summary: string
	skillsMatched: string[] | null
	originalName: string
}

function statusBadgeVariant(status: ProfilingSession["status"]) {
	switch (status) {
		case "processing":
			return "secondary"
		case "completed":
			return "default"
		case "failed":
			return "destructive"
	}
}

export default function ProfilingResultsPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const [session, setSession] = useState<ProfilingSession>()
	const [files, setFiles] = useState<SessionFile[]>([])
	const [results, setResults] = useState<CandidateResult[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isExporting, setIsExporting] = useState(false)

	useEffect(() => {
		if (id) {
			void fetchSession()
		}
	}, [id])

	const fetchSession = async () => {
		try {
			const { data, error } = await api.api.v2.sessions({ id: id! }).get()

			if (error || !data) {
				if (
					typeof error === "object" &&
					error !== null &&
					"message" in error &&
					(error as { message?: string }).message === "Session not found"
				) {
					toast.error("Profiling session not found")
					navigate("/dashboard")
					return
				}
				throw new Error("Failed to fetch session")
			}

			setSession(data.session as ProfilingSession)
			setFiles((data.files || []))

			// Results are included in the response when the session is completed
			if (data.session.status === "completed" && data.results) {
				const rankedResults = (data.results as any[]).map((r: any, index: number) => ({
					...r,
					rank: index + 1
				})) as Required<CandidateResult>[]

				setResults(rankedResults)
			}
		} catch (err) {
			toast.error("Failed to load profiling session")
			console.error(err)
		} finally {
			setIsLoading(false)
		}
	}

	const exportResults = async () => {
		if (!id) return
		setIsExporting(true)

		try {
			const res = await fetch(`/api/v2/sessions/${id}/export?format=csv`, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("resumemo_auth_token") || ""}`
				}
			})

			if (!res.ok) throw new Error("Failed to export")

			const blob = await res.blob()
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement("a")
			a.href = url
			a.download = `${session?.name || "session"}-results.csv`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			window.URL.revokeObjectURL(url)

			toast.success("Results exported successfully")
		}
		catch (err) {
			toast.error("Export failed")
			console.error(err)
		}
		finally {
			setIsExporting(false)
		}
	}

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-[60vh]">
				<Loader2 className="size-10 animate-spin text-primary mb-4" />
				<p className="text-muted-foreground">Loading profiling session...</p>
			</div>
		)
	}

	if (!session) {
		return null
	}

	const isCompleted = session.status === "completed"
	const isFailed = session.status === "failed"

	const summaryHighlights = [
		"Strong overall alignment with specified technical requirements.",
		`${results.filter(r => r.overallScore > 80).length} candidates exceed the 80/100 threshold.`,
		"Multiple candidates flagged with senior leadership experience."
	]

	return (
		<div className="flex flex-col gap-8">
			{/* Header */}
			<section className="flex flex-col gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<Badge variant={statusBadgeVariant(session.status)} className="text-xs uppercase tracking-widest">
						{session.status}
					</Badge>
					<p className="text-sm text-muted-foreground">
						{isCompleted
							? `Finished ${new Date(session.createdAt).toLocaleDateString()}`
							: `Created ${new Date(session.createdAt).toLocaleDateString()}`}
					</p>
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" className="shrink-0 size-8 mr-1 -ml-2" onClick={() => navigate("/profiling")}>
							<ArrowLeft className="size-5" />
						</Button>
						<h1 className="head-text-md text-foreground">{session.name}</h1>
					</div>
					<p className="text-sm text-muted-foreground ml-10">
						Session ID {session.id.substring(0, 8)} • {session.jobTitle || "Custom Job Description"}
					</p>
					{session.jobDescription && (
						<p className="text-sm text-muted-foreground max-w-4xl line-clamp-2 mt-1 ml-10">
							{session.jobDescription}
						</p>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{isCompleted && (
						<Button size="sm" className="gap-2" onClick={exportResults} disabled={isExporting}>
							{isExporting ? <Loader2 className="size-4 animate-spin" /> : <>Export results</>}
							<Download className="size-4" />
						</Button>
					)}
					<Button size="sm" variant="outline" className="gap-2">
						Share
						<Mail className="size-4" />
					</Button>
					<Button size="sm" variant="ghost" className="gap-2" onClick={() => navigate(`/profiling/${id}`)}>
						View session details
						<ArrowUpRight className="size-4" />
					</Button>
				</div>
			</section>

			{/* Processing state */}
			{session.status === "processing" && (
				<section className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card shadow-sm mx-auto w-full max-w-4xl">
					<div className="size-16 rounded-full bg-sky-500/10 flex items-center justify-center mb-6">
						<Loader2 className="size-8 text-sky-500 animate-spin" />
					</div>
					<h2 className="text-2xl font-semibold mb-2 tracking-tight">Profiling in Progress</h2>
					<p className="text-muted-foreground mb-4">
						Scoring {session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""} against your requirements...
					</p>
					<p className="text-xs text-muted-foreground max-w-sm text-balance">
						This typically takes a few minutes. You can leave this page—results will be saved automatically.
					</p>
				</section>
			)}

			{/* Failed state */}
			{isFailed && (
				<section className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card shadow-sm mx-auto w-full max-w-4xl">
					<h2 className="text-2xl font-semibold mb-2 tracking-tight">Analysis Failed</h2>
					<p className="text-muted-foreground max-w-md mb-2">The pipeline encountered an error during scoring.</p>
					{session.errorMessage && (
						<p className="text-sm text-destructive font-mono bg-destructive/5 px-4 py-2 rounded-md mb-6 max-w-md break-all">
							{session.errorMessage}
						</p>
					)}
					<Button variant="outline" onClick={() => navigate("/profiling/new")}>
						<ArrowLeft className="size-4 mr-2" />
						New Session
					</Button>
				</section>
			)}

			{/* Completed: ranking summary + filters */}
			{isCompleted && (
				<>
					<section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
						<Card className="h-full shadow-x border-none">
							<CardHeader className="flex flex-row items-center justify-between gap-6 border-b border-border/50 dark:border-border/30 pb-4">
								<div>
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Ranking summary</CardTitle>
									<CardDescription className="text-sm mt-1">Scoring overview for {session.totalFiles} candidates.</CardDescription>
								</div>
								<Badge variant="secondary" className="flex items-center gap-1 text-xs">
									<BarChart3 className="size-3" /> View analytics
								</Badge>
							</CardHeader>
							<CardContent className="px-4">
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									<SummaryTile label="Resumes processed" value={session.totalFiles} subtext="Source resumes" />
									<SummaryTile label="Top tier" value={results.filter(r => r.overallScore >= 80).length} subtext="Score > 80" />
									<SummaryTile
										label="Average score"
										value={results.length > 0 ? `${Math.round(results.reduce((acc, r) => acc + r.overallScore, 0) / results.length)}/100` : "0/100"}
										subtext="Across all candidates"
									/>
								</div>
								<div className="mt-6 space-y-3 text-sm text-muted-foreground">
									{summaryHighlights.map((highlight, i) => (
										<div key={i} className="flex items-start gap-3">
											<ThumbsUp className="size-4 text-primary" />
											<p>{highlight}</p>
										</div>
									))}
								</div>
							</CardContent>
						</Card>

						<Card className="border-none shadow-x">
							<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4">
								<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Filters</CardTitle>
								<CardDescription className="text-sm mt-1">Adjust scoring thresholds and view specific segments.</CardDescription>
							</CardHeader>
							<CardContent>
								<Tabs defaultValue="scores">
									<TabsList>
										<TabsTrigger className="border-none cursor-pointer" value="scores">Scores</TabsTrigger>
										<TabsTrigger className="border-none cursor-pointer" value="skills">Skills</TabsTrigger>
										<TabsTrigger className="border-none cursor-pointer" value="experience">Experience</TabsTrigger>
									</TabsList>
									<TabsContent value="scores" className="mt-4 space-y-3 text-sm text-muted-foreground">
										<p>Focus on candidates above a certain match score to build your shortlist.</p>
										<Button size="sm" variant="outline" className="gap-2 self-start">
											<Filter className="size-4" /> Configure threshold
										</Button>
									</TabsContent>
									<TabsContent value="skills" className="mt-4 space-y-3 text-sm text-muted-foreground">
										<p>Toggle essential technical skills or keywords found during the analysis.</p>
										<div className="flex flex-wrap gap-2">
											{Array.from(new Set(results.flatMap(r => r.skillsMatched || []))).slice(0, 5).map(skill => (
												<Badge key={skill} variant="outline">{skill}</Badge>
											))}
										</div>
									</TabsContent>
									<TabsContent value="experience" className="mt-4 space-y-2 text-sm text-muted-foreground">
										<p>Filter candidates by inferred years of experience or leadership signals.</p>
									</TabsContent>
								</Tabs>
							</CardContent>
						</Card>
					</section>

					{/* Ranked candidates table + spotlight */}
					<section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
						<Card className="xl:col-span-2 shadow-m border-border/60 dark:border-border/40">
							<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
								<div>
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Ranked candidates</CardTitle>
									<CardDescription className="text-sm mt-1">Sort and filter to build interview-ready slates.</CardDescription>
								</div>
								<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
									<span>Scoring model: Default similarity</span>
									<Badge variant="outline">Confidence: High</Badge>
								</div>
							</CardHeader>
							<CardContent className="space-y-4">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Rank</TableHead>
											<TableHead>Candidate</TableHead>
											<TableHead className="hidden sm:table-cell">Alignment highlights</TableHead>
											<TableHead className="hidden md:table-cell">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{results.length === 0 ? (
											<TableRow>
												<TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
													No results generated for this session.
												</TableCell>
											</TableRow>
										) : (
											results.map((candidate) => (
												<TableRow
													key={candidate.id}
													className="group align-top transition-all hover:bg-muted/55 cursor-pointer"
												>
													<TableCell>
														<Badge variant="secondary" className="text-xs shadow-sm">
															#{candidate.rank}
														</Badge>
													</TableCell>
													<TableCell className="space-y-1">
														<p className="font-semibold text-foreground group-hover:text-primary transition-colors">
															{candidate.candidateName || "Unknown Candidate"}
														</p>
														<p className="text-xs text-muted-foreground">Score {candidate.overallScore}/100</p>
														{candidate.candidateEmail && (
															<p className="text-xs text-muted-foreground flex items-center gap-1.5">
																<Mail className="size-3" />
																{candidate.candidateEmail}
															</p>
														)}
													</TableCell>
													<TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
														<p className="line-clamp-2 leading-snug">{candidate.summary}</p>
														{candidate.skillsMatched && candidate.skillsMatched.length > 0 && (
															<div className="flex flex-wrap gap-1.5 mt-2">
																{candidate.skillsMatched.slice(0, 4).map(skill => (
																	<span key={skill} className="text-[10px] uppercase font-medium tracking-wider text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-sm">
																		{skill}
																	</span>
																))}
																{candidate.skillsMatched.length > 4 && (
																	<span className="text-[10px] font-medium text-muted-foreground/70 px-1 py-0.5">
																		+{candidate.skillsMatched.length - 4}
																	</span>
																)}
															</div>
														)}
													</TableCell>
													<TableCell className="hidden md:table-cell">
														<div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
															<Button size="sm" variant="outline" className="gap-1 shadow-sm hover:shadow-md transition-shadow">
																<Mail className="size-3.5" />
																Reach out
															</Button>
															<Button size="sm" variant="ghost" className="gap-1">
																<ArrowUpRight className="size-3.5" />
																Profile
															</Button>
														</div>
													</TableCell>
												</TableRow>
											))
										)}
									</TableBody>
								</Table>
							</CardContent>

							<CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 py-4 text-xs text-muted-foreground">
								<span>Export full CSV or sync shortlist to ATS.</span>
								<div className="flex gap-2">
									<Button size="sm" variant="secondary" onClick={exportResults} disabled={isExporting}>
										Download CSV
									</Button>
									<Button size="sm" variant="ghost">
										Sync to ATS
									</Button>
								</div>
							</CardFooter>
						</Card>

						{/* Candidate spotlight */}
						{results.length > 0 && (
							<Card className="shadow-m border-none">
								<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4">
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Candidate spotlight</CardTitle>
									<CardDescription className="text-sm mt-1">Dig into resume insights for top candidates.</CardDescription>
								</CardHeader>

								<CardContent className="space-y-3 text-sm text-muted-foreground pt-6">
									{results.slice(0, 2).map((candidate) => (
										<div key={candidate.id} className="group rounded-lg border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-x transition-all hover:-translate-y-0.5 cursor-pointer">
											<p className="text-sm font-semibold text-foreground">{candidate.candidateName || "Top Candidate"}</p>
											<p className="mt-1 text-xs">Score {candidate.overallScore}/100 • Rank #{candidate.rank}</p>
											<p className="mt-3 text-xs leading-relaxed line-clamp-3">{candidate.summary}</p>
											<Button size="sm" variant="ghost" className="mt-4 gap-2">
												View resume
												<ArrowUpRight className="size-4" />
											</Button>
										</div>
									))}
								</CardContent>
								<CardFooter className="border-t bg-muted/20 py-4">
									<Button size="sm" variant="secondary" className="w-full gap-2">
										Compare candidates
										<ArrowUpRight className="size-4" />
									</Button>
								</CardFooter>
							</Card>
						)}
					</section>
				</>
			)}

			{/* File list — shown for non-completed states */}
			{!isCompleted && files.length > 0 && (
				<section>
					<Card className="shadow-m border-border/60 dark:border-border/40 overflow-hidden">
						<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4">
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Uploaded documents
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								{files.length} resume{files.length !== 1 ? "s" : ""} in this session
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{files.map((file) => (
									<div
										key={file.id}
										className="rounded-lg border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:-translate-y-0.5 cursor-pointer"
									>
										<div className="flex items-center gap-3.5">
											<div className="shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center">
												<FileText className="size-5 text-primary/80" />
											</div>
											<div className="min-w-0">
												<p className="font-medium text-sm text-foreground truncate" title={file.originalName}>
													{file.originalName}
												</p>
												<p className="text-xs text-muted-foreground mt-0.5">
													{formatFileSize(Number(file.size))}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
				</section>
			)}
		</div>
	)
}

function SummaryTile({ label, value, subtext }: {
	label: string
	value: string | number
	subtext: string
}) {
	return (
		<div className="rounded-xl border-none shadow-m bg-muted/55 py-4 pl-3 pr-5 transition-all hover:-translate-y-0.5 grid">
			<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
			<p className="mt-2 text-2xl font-bold text-foreground bg-linear-to-br from-foreground to-foreground/80 bg-clip-text">{value}</p>
			<p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
		</div>
	)
}
