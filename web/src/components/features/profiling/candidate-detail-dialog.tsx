import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Download, ExternalLink, Mail, Phone, UserRound } from "lucide-react"
import { toast } from "sonner"

import { QueryErrorBoundary } from "@/components/feedback/query-error-boundary"
import { RouteErrorFallback } from "@/components/feedback/route-error-fallback"
import { Badge } from "@/components/ui/badge"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { candidateDetailQueryOptions } from "@/lib/profiling-queries"
import { Button } from "@/components/ui/button"
import { downloadSessionFile, openSessionFile } from "@/lib/session-file-access"
import { getErrorMessage } from "@/lib/errors"

import { SummaryTile } from "./summary-tile"
import {
	getDisplayCandidateName,
	getEducationLines,
	getExperienceLabel,
	getManualReviewLabel,
	getMissingSkills,
	getPrimarySkills,
	getRecentRoles,
	needsManualReview,
} from "./session-utils"

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
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Summary</p>
						<p className="mt-2 leading-6 text-foreground">{selectedResult.summary}</p>
					</div>
					<div className="flex shrink-0 flex-wrap gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => {
								void openSessionFile({ sessionId, fileId: selectedResult.fileId }).catch(error => {
									toast.error(getErrorMessage(error, "Could not open original file"))
								})
							}}
						>
							<ExternalLink className="size-4" />
							View original
						</Button>
						<Button
							size="sm"
							variant="secondary"
							onClick={() => {
								void downloadSessionFile({ sessionId, fileId: selectedResult.fileId }).catch(error => {
									toast.error(getErrorMessage(error, "Could not download original file"))
								})
							}}
						>
							<Download className="size-4" />
							Download
						</Button>
					</div>
				</div>
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

type CandidateDetailDialogProps = {
	sessionId: string
	resultId: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function CandidateDetailDialog({ sessionId, resultId, open, onOpenChange }: CandidateDetailDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] xl:max-w-[1080px] 2xl:max-w-6xl overflow-y-auto">
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
