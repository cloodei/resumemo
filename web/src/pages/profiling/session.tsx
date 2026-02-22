import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
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
	Sparkles,
	AlertCircle,
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
	status: "ready" | "processing" | "completed" | "failed"
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
		case "ready":
			return "outline"
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
	const [isStarting, setIsStarting] = useState(false)
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
			
			// If completed, fetch results
			if (data.session.status === "completed") {
				void fetchResults()
			} else {
				setIsLoading(false)
			}
		} catch (err) {
			toast.error("Failed to load profiling session")
			console.error(err)
			setIsLoading(false)
		}
	}

	const fetchResults = async () => {
		try {
			const { data, error } = await api.api.v2.sessions({ id: id! }).results.get({
				query: { sort: "desc" }
			})
			
			if (error || !data) {
				throw new Error("Failed to fetch results")
			}
			
			// Map results and assign ranks
			const rankedResults = data.results.map((r: any, index: number) => ({
				...r,
				rank: index + 1
			})) as Required<CandidateResult>[]
			
			setResults(rankedResults)
		} catch (err) {
			// Silently fail results fetch, just show raw files
			console.error(err)
		} finally {
			setIsLoading(false)
		}
	}

	const startProfiling = async () => {
		if (!id) return

		setIsStarting(true)
		try {
			const { data, error } = await api.api.v2.sessions({ id }).start.post()

			if (error || !data) {
				const errorData = error as { message?: string } | undefined
				throw new Error(errorData?.message || "Failed to start profiling")
			}

			toast.success("Profiling started!")
			fetchSession() // re-fetch to show processing status
		}
		catch (err) {
			const message = err instanceof Error ? err.message : "Failed to start"
			toast.error(message)
		}
		finally {
			setIsStarting(false)
		}
	}

	const exportResults = async () => {
		if (!id) return
		setIsExporting(true)

		try {
			// Generate standard download using fetch
			const res = await fetch(`/api/v2/sessions/${id}/export?format=csv`, {
				headers: {
					Authorization: `Bearer ${localStorage.getItem("resumemo_auth_token") || ""}` // fallback if needed
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

	const isReady = session.status === "ready"
	const isProcessing = session.status === "processing"
	const isCompleted = session.status === "completed"
	const isFailed = session.status === "failed"

	// Mock data for analytics
	const summaryHighlights = [
		"Strong overall alignment with specified technical requirements.",
		`${results.filter(r => r.overallScore > 80).length} candidates exceed the 80/100 threshold.`,
		"Multiple candidates flagged with senior leadership experience."
	]

	return (
		<div className="flex flex-col gap-8">
			{/* Header */}
			<motion.section
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-col gap-4"
			>
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<Badge variant={statusBadgeVariant(session.status)} className="text-xs uppercase tracking-widest text-[10px] sm:text-xs py-0.5!">
							{session.status}
						</Badge>
						<p className="text-sm text-muted-foreground">
							{isCompleted ? "Finished AI analysis" : `Created ${new Date(session.createdAt).toLocaleDateString()}`}
						</p>
					</div>

					<div className="flex flex-wrap items-center gap-2">
						{isCompleted && (
							<Button size="sm" className="gap-2 shadow-sm" onClick={exportResults} disabled={isExporting}>
								{isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
								Export results
							</Button>
						)}
						<Button size="sm" variant="outline" className="gap-2 shadow-sm">
							<Mail className="size-4" />
							Share
						</Button>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<div className="flex items-center gap-3">
						<Button variant="ghost" size="icon" className="shrink-0 size-8 mr-1 -ml-2" onClick={() => navigate("/profiling")}>
							<ArrowLeft className="size-5" />
						</Button>
						<h1 className="head-text-md text-foreground tracking-tight">{session.name}</h1>
					</div>
					
					<p className="text-sm text-muted-foreground ml-10">
						Session ID {session.id.substring(0, 8)} • {session.jobTitle || "Custom Job Description"}
					</p>
					{session.jobDescription && (
						<p className="text-sm text-muted-foreground max-w-4xl line-clamp-2 mt-2 ml-10">
							{session.jobDescription}
						</p>
					)}
				</div>
			</motion.section>

			<AnimatePresence mode="wait">
				{/* Processing / Non-Completed States */}
				{!isCompleted && (
					<motion.section
						key="pending-state"
						initial={{ opacity: 0, scale: 0.98 }}
						animate={{ opacity: 1, scale: 1 }}
						exit={{ opacity: 0, scale: 0.98 }}
						className="flex flex-col items-center justify-center py-16 text-center border rounded-xl bg-card shadow-sm mx-auto w-full max-w-4xl"
					>
						{isReady && (
							<>
								<div className="size-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-6 shadow-sm">
									<Sparkles className="size-10 text-violet-500" />
								</div>
								<h2 className="text-2xl font-semibold mb-2 tracking-tight">Ready to Profile</h2>
								<p className="text-muted-foreground max-w-md mb-8 text-balance">
									{session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""} securely stored and ready to be
									analyzed against your job requirements.
								</p>
								<Button size="lg" onClick={startProfiling} disabled={isStarting} className="gap-2 shadow-sm px-8">
									{isStarting ? (
										<>
											<Loader2 className="size-4 animate-spin" />
											Starting pipeline...
										</>
									) : (
										<>
											<Sparkles className="size-4" />
											Run AI Analysis
										</>
									)}
								</Button>
							</>
						)}

						{isProcessing && (
							<>
								<div className="size-20 rounded-full bg-sky-500/10 flex items-center justify-center mb-6 shadow-sm">
									<Loader2 className="size-10 text-sky-500 animate-spin" />
								</div>
								<h2 className="text-2xl font-semibold mb-2 tracking-tight">Profiling in Progress</h2>
								<p className="text-muted-foreground mb-4">
									AI pipeline is actively scoring {session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""}...
								</p>
								<p className="text-xs text-muted-foreground max-w-sm text-balance">
									This typically takes a few minutes. You can leave this page—results will be saved automatically.
								</p>
							</>
						)}

						{isFailed && (
							<>
								<div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6 shadow-sm">
									<AlertCircle className="size-10 text-destructive" />
								</div>
								<h2 className="text-2xl font-semibold mb-2 tracking-tight">Analysis Failed</h2>
								<p className="text-muted-foreground max-w-md mb-2">The pipeline encountered an error during scoring.</p>
								{session.errorMessage && (
									<p className="text-sm text-destructive font-mono bg-destructive/5 px-4 py-2 rounded-md mb-6 max-w-md break-all">
										{session.errorMessage}
									</p>
								)}
								<div className="flex gap-3">
									<Button variant="outline" onClick={() => navigate("/profiling/new")} className="shadow-sm">
										<ArrowLeft className="size-4 mr-2" />
										New Session
									</Button>
								</div>
							</>
						)}
					</motion.section>
				)}

				{/* COMPLETED STATE: Rich Job Results Layout */}
				{isCompleted && (
					<motion.div
						key="completed-state"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						className="flex flex-col gap-8"
					>
						{/* Top summary cards */}
						<section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
							<Card className="h-full shadow-m border-border/60 dark:border-border/40 hover:shadow-lg transition-shadow duration-300">
								<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4 bg-muted/5">
									<div>
										<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Ranking Report</CardTitle>
										<CardDescription className="text-sm mt-1">AI analysis overview for {session.totalFiles} candidates.</CardDescription>
									</div>
									<Badge variant="secondary" className="flex items-center gap-1.5 text-xs shadow-sm cursor-pointer hover:bg-secondary/80">
										<BarChart3 className="size-3.5" /> View full metrics
									</Badge>
								</CardHeader>
								<CardContent className="px-4 py-6">
									<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
										<SummaryTile label="Total Processed" value={session.totalFiles} subtext="Source resumes" />
										<SummaryTile label="Top Tier" value={results.filter(r => r.overallScore >= 80).length} subtext="Score > 80" />
										<SummaryTile 
											label="Avg Score" 
											value={results.length > 0 ? `${Math.round(results.reduce((acc, r) => acc + r.overallScore, 0) / results.length)}/100` : "0/100"} 
											subtext="Across all candidates" 
										/>
									</div>
									<div className="space-y-3.5 text-sm text-muted-foreground border-t pt-6">
										{summaryHighlights.map((highlight, i) => (
											<div key={i} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/30 transition-colors">
												<div className="mt-0.5 shrink-0 bg-primary/10 p-1 rounded-sm">
													<ThumbsUp className="size-3.5 text-primary" />
												</div>
												<p className="leading-relaxed">{highlight}</p>
											</div>
										))}
									</div>
								</CardContent>
							</Card>

							<Card className="border-border/60 shadow-x hover:shadow-m transition-shadow duration-300 flex flex-col">
								<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4 bg-muted/5">
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Filters</CardTitle>
									<CardDescription className="text-sm mt-1">Adjust scoring thresholds and view specific segments.</CardDescription>
								</CardHeader>
								<CardContent className="flex-1 pt-6">
									<Tabs defaultValue="scores">
										<TabsList className="w-full justify-start overflow-x-auto bg-muted/40">
											<TabsTrigger className="border-none cursor-pointer rounded-sm" value="scores">Scores</TabsTrigger>
											<TabsTrigger className="border-none cursor-pointer rounded-sm" value="skills">Skills</TabsTrigger>
											<TabsTrigger className="border-none cursor-pointer rounded-sm" value="experience">Experience</TabsTrigger>
										</TabsList>
										<TabsContent value="scores" className="mt-6 space-y-4 text-sm text-muted-foreground">
											<p className="leading-relaxed">Focus on candidates above a certain AI match score to quickly build your interview shortlist.</p>
											<Button size="sm" variant="outline" className="gap-2 shadow-sm font-medium">
												<Filter className="size-4" /> Configure score threshold
											</Button>
										</TabsContent>
										<TabsContent value="skills" className="mt-6 space-y-4 text-sm text-muted-foreground">
											<p className="leading-relaxed">Toggle essential technical skills or keywords found during the semantic analysis.</p>
											<div className="flex flex-wrap gap-2 pt-2">
												{Array.from(new Set(results.flatMap(r => r.skillsMatched || []))).slice(0, 5).map(skill => (
													<Badge key={skill} variant="secondary" className="bg-muted capitalize font-normal px-2.5 py-1">{skill}</Badge>
												))}
											</div>
										</TabsContent>
										<TabsContent value="experience" className="mt-6 space-y-3 text-sm text-muted-foreground">
											<p className="leading-relaxed">Filter candidates by inferred years of experience or leadership signals.</p>
										</TabsContent>
									</Tabs>
								</CardContent>
							</Card>
						</section>

						{/* Main Results Table & Spotlight */}
						<section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
							<Card className="xl:col-span-2 shadow-lg border-border/60 hover:border-border/80 transition-colors duration-300">
								<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4 bg-muted/10">
									<div>
										<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Ranked Candidates</CardTitle>
										<CardDescription className="text-sm mt-1">Sorted by AI similarity match score.</CardDescription>
									</div>
									<div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
										<span className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-primary/70" /> Default Model</span>
										<Badge variant="outline" className="bg-background shadow-xs">High Confidence</Badge>
									</div>
								</CardHeader>
								<CardContent className="p-0">
									<Table>
										<TableHeader className="bg-muted/5">
											<TableRow className="hover:bg-transparent">
												<TableHead className="pl-6 w-16">Rank</TableHead>
												<TableHead className="w-[30%]">Candidate</TableHead>
												<TableHead className="hidden sm:table-cell w-[40%]">AI Analysis Summary</TableHead>
												<TableHead className="hidden md:table-cell text-right pr-6">Actions</TableHead>
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
														className="group align-top transition-colors hover:bg-muted/40 cursor-pointer"
													>
														<TableCell className="pl-6 pt-5">
															<Badge variant={candidate.rank === 1 ? "default" : "secondary"} className="shadow-sm font-medium">
																#{candidate.rank}
															</Badge>
														</TableCell>
														<TableCell className="pt-4 space-y-1.5">
															<p className="font-semibold text-foreground group-hover:text-primary transition-colors text-base truncate pr-4">
																{candidate.candidateName || "Unknown Candidate"}
															</p>
															<div className="flex items-center gap-2">
																<Badge variant="outline" className="text-[10px] font-medium bg-background text-primary/90">
																	Score {candidate.overallScore}/100
																</Badge>
															</div>
															{candidate.candidateEmail && (
																<p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
																	<Mail className="size-3" />
																	{candidate.candidateEmail}
																</p>
															)}
														</TableCell>
														<TableCell className="hidden sm:table-cell pt-4">
															<p className="text-sm text-foreground/80 line-clamp-2 leading-snug">
																{candidate.summary}
															</p>
															{candidate.skillsMatched && candidate.skillsMatched.length > 0 && (
																<div className="flex flex-wrap gap-1.5 mt-2.5">
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
														<TableCell className="hidden md:table-cell pt-4 pr-6">
															<div className="flex flex-col items-end gap-2 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
																<Button size="sm" variant="secondary" className="h-8 gap-1.5 shadow-sm hover:shadow-md transition-shadow text-xs">
																	<ArrowUpRight className="size-3.5" />
																	Full Profile
																</Button>
															</div>
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</CardContent>
							</Card>

							{/* Spotlight / Top Picks right column */}
							{results.length > 0 && (
								<Card className="shadow-m border-border/60 bg-linear-to-b from-background to-muted/10 h-max sticky top-6">
									<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4">
										<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text flex items-center gap-2">
											<Sparkles className="size-4 text-amber-500" />
											Candidate Spotlight
										</CardTitle>
										<CardDescription className="text-sm mt-1">Deep dive into top recommended profiles.</CardDescription>
									</CardHeader>

									<CardContent className="space-y-4 text-sm text-muted-foreground pt-6">
										{results.slice(0, 2).map((candidate, i) => (
											<div key={candidate.id} className="group rounded-xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/20 cursor-pointer">
												<div className="flex justify-between items-start mb-3">
													<div>
														<p className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">{candidate.candidateName || "Top Candidate"}</p>
														<p className="mt-1 text-xs font-medium text-primary">Score {candidate.overallScore}/100 • Rank #{candidate.rank}</p>
													</div>
													{i === 0 && <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-transparent">Best Match</Badge>}
												</div>
												<p className="text-xs leading-relaxed text-foreground/80 line-clamp-3 mb-4">
													{candidate.summary}
												</p>
												<Button size="sm" variant="ghost" className="w-full text-xs font-medium gap-2 justify-center bg-muted/50 hover:bg-primary/10 hover:text-primary">
													View full dossier
													<ArrowUpRight className="size-3.5" />
												</Button>
											</div>
										))}
									</CardContent>
									<CardFooter className="border-t border-border/50 bg-muted/5 py-4">
										<Button size="sm" variant="outline" className="w-full gap-2 shadow-xs bg-background">
											Compare top candidates
											<Filter className="size-3.5" />
										</Button>
									</CardFooter>
								</Card>
							)}
						</section>
					</motion.div>
				)}
			</AnimatePresence>

			{/* File list — shown for non-completed states */}
			{!isCompleted && files.length > 0 && (
				<motion.section
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 }}
				>
					<Card className="shadow-m border-border/60 dark:border-border/40 overflow-hidden">
						<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4 bg-muted/5">
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Uploaded Documents
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								{files.length} resume{files.length !== 1 ? "s" : ""} waiting for analysis in this session
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{files.map((file) => (
									<div
										key={file.id}
										className="rounded-xl bg-card border border-border/40 p-4 shadow-xs transition-colors hover:bg-muted/30"
									>
										<div className="flex items-center gap-3.5">
											<div className="shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center shadow-inner">
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
				</motion.section>
			)}
		</div>
	)
}

function SummaryTile({ label, value, subtext }: { label: string; value: string | number; subtext: string }) {
	return (
		<div className="rounded-xl border border-border/50 shadow-xs bg-card p-5 transition-transform hover:-translate-y-0.5 flex flex-col justify-between h-full">
			<p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80 mb-2">{label}</p>
			<p className="text-3xl font-bold text-foreground bg-linear-to-br from-foreground to-foreground/80 bg-clip-text mb-1 tracking-tight">{value}</p>
			<p className="text-xs text-muted-foreground font-medium">{subtext}</p>
		</div>
	)
}
