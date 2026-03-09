import { ArrowUpRight, Mail, Sparkles } from "lucide-react"

import { ActionCard } from "@/components/features/profiling/action-card"
import { SummaryTile } from "@/components/features/profiling/summary-tile"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CandidateResult, ProfilingSession } from "@/lib/profiling-queries"

import type { RetryMode } from "./session-utils"
import {
	getDisplayCandidateName,
	getExperienceLabel,
	getManualReviewLabel,
	getPrimarySkills,
	needsManualReview,
} from "./session-utils"

type CompletedSessionViewProps = {
	session: ProfilingSession
	results: CandidateResult[]
	strongMatches: number
	manualReviewCount: number
	averageScore: number
	isExporting: boolean
	onExport: () => void
	onOpenRetry: (mode: RetryMode) => void
	onSelectCandidate: (resultId: string) => void
}

export function CompletedSessionView({
	session,
	results,
	strongMatches,
	manualReviewCount,
	averageScore,
	isExporting,
	onExport,
	onOpenRetry,
	onSelectCandidate,
}: CompletedSessionViewProps) {
	return (
		<>
			<section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
				<Card className="h-full border-none shadow-x">
					<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
						<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">Session overview</CardTitle>
						<CardDescription className="mt-1 text-sm">A recruiter-friendly snapshot of the latest completed run.</CardDescription>
					</CardHeader>
					<CardContent className="px-4">
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
							<SummaryTile label="Candidates reviewed" value={session.totalFiles} subtext="Resumes processed" />
							<SummaryTile label="Strong matches" value={strongMatches} subtext="Match score 80+" />
							<SummaryTile label="Needs review" value={manualReviewCount} subtext="Manual follow-up recommended" />
							<SummaryTile label="Average match" value={`${averageScore}/100`} subtext="Across the current run" />
						</div>
						<div className="mt-6 space-y-3 text-sm text-muted-foreground">
							<div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-4 text-primary" /><p>{strongMatches > 0 ? `${strongMatches} candidates stand out as strong matches for this brief.` : "No candidates crossed the strong-match threshold yet."}</p></div>
							<div className="flex items-start gap-3"><Sparkles className="mt-0.5 size-4 text-primary" /><p>{manualReviewCount > 0 ? `${manualReviewCount} candidate${manualReviewCount === 1 ? " needs" : "s need"} a quick manual check for extracted details.` : "No manual review flags were raised in this run."}</p></div>
						</div>
					</CardContent>
				</Card>

				<Card className="border-none shadow-x gap-3">
					<CardHeader className="border-b border-border/50 [.border-b]:pb-2 dark:border-border/30">
						<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">
							Next actions
						</CardTitle>
						<CardDescription className="mt-0 text-sm">
							Choose whether to keep this run, duplicate it, or replace it with a refreshed version.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3 pt-2 text-sm text-muted-foreground">
						<ActionCard title="Retry now" description="Re-score this session in place with a new result." onClick={() => onOpenRetry("rerun_current")} />
						<ActionCard title="New copy" description="Re-score this session as a copy, using the same files and current brief." onClick={() => onOpenRetry("clone_current")} />
						<ActionCard title="Update as new" description="Edit the brief and create a new follow-up session." onClick={() => onOpenRetry("clone_with_updates")} />
						<ActionCard title="Update and replace" description="Edit this session and re-score it in place." onClick={() => onOpenRetry("replace_with_updates")} />
					</CardContent>
				</Card>
			</section>

			<section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
				<Card className="xl:col-span-2 border-border/60 shadow-m dark:border-border/40">
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4 dark:border-border/30">
						<div>
							<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">Ranked candidates</CardTitle>
							<CardDescription className="mt-1 text-sm">Open a candidate to inspect experience, strengths, and contact details.</CardDescription>
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
										<TableRow key={candidate.id} className="group cursor-pointer align-top transition-all hover:bg-muted/55" onClick={() => onSelectCandidate(candidate.id)}>
											<TableCell><Badge variant="secondary" className="text-xs shadow-sm">#{candidate.rank}</Badge></TableCell>
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
						<Button size="sm" variant="secondary" onClick={onExport} disabled={isExporting}>Download CSV</Button>
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
								<div key={candidate.id} className="cursor-pointer rounded-lg bg-muted/30 p-4 shadow-x transition-all hover:-translate-y-0.5 dark:bg-muted/20" onClick={() => onSelectCandidate(candidate.id)}>
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
	)
}
