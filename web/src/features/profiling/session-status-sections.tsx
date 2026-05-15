import { toast } from "sonner"
import { FileDown, FileText, RefreshCw, RotateCcw, TriangleAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SummaryTile } from "@/features/profiling/summary-tile"
import { getErrorMessage } from "@/lib/errors"
import { downloadSessionFile, openSessionFile } from "@/features/profiling/api/session-file-access"
import type { RetryMode, ProfilingSessionDetailData } from "./utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ProfilingSession = ProfilingSessionDetailData["session"]
type RunningSessionSectionProps = {
	session: ProfilingSession
	onRefresh: () => void
}

export function RunningSessionSection({ session, onRefresh }: RunningSessionSectionProps) {
	return (
		<section className="mx-auto flex w-full max-w-4xl flex-col gap-5 rounded-xl border bg-card p-8 shadow-sm">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<div className="w-fit rounded-md bg-secondary px-3 py-1 text-sm text-secondary-foreground">
						{session.status === "retrying" ? "Refreshing in background" : "Running in background"}
					</div>
					<h2 className="text-2xl font-semibold tracking-tight">
						{session.status === "retrying" ? "This session is being refreshed" : "This session is still scoring"}
					</h2>
					<p className="max-w-2xl text-muted-foreground">
						You do not need to wait here. The screening job keeps running even if you leave this page, and this view refreshes quietly in the background.
					</p>
				</div>
				<Button size="sm" variant="outline" className="gap-2" onClick={onRefresh}>
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
	)
}

type FailedSessionSectionProps = {
	session: ProfilingSession
	onOpenRetry: (mode: RetryMode) => void
}

export function FailedSessionSection({ session, onOpenRetry }: FailedSessionSectionProps) {
	return (
		<section className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center rounded-xl border bg-card py-16 text-center shadow-sm">
			<div className="mb-5 flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
				<TriangleAlert className="size-8" />
			</div>
			<h2 className="mb-2 text-2xl font-semibold tracking-tight">Screening stopped before completion</h2>
			<p className="mb-6 max-w-lg text-muted-foreground">
				Processing could not continue for this session. You can retry now, or create a separate follow-up session if you want to preserve this attempt.
			</p>
			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button className="gap-2" onClick={() => onOpenRetry("rerun_current")}>
					<RefreshCw className="size-4" />
					Retry now
				</Button>
				<Button variant="outline" className="gap-2" onClick={() => onOpenRetry("clone_current")}>
					<RotateCcw className="size-4" />
					Create new copy
				</Button>
			</div>
			{session.errorMessage && (
				<div className="mt-6 max-w-2xl rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-left text-sm text-muted-foreground">
					<p className="font-medium text-foreground">What happened</p>
					<p className="mt-1 wrap-break-word">{session.errorMessage}</p>
				</div>
			)}
		</section>
	)
}

type UploadedDocumentsSectionProps = {
	sessionId: string
	files: Array<{ fileId: number; originalName: string; size: number }>
	formatFileSize: (size: number) => string
}

export function UploadedDocumentsSection({ sessionId, files, formatFileSize }: UploadedDocumentsSectionProps) {
	return (
		<section>
			<Card className="overflow-hidden border-border/60 shadow-m dark:border-border/40">
				<CardHeader className="border-b border-border/50 pb-4 dark:border-border/30">
					<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">Uploaded documents</CardTitle>
					<CardDescription className="mt-1 text-sm">{files.length} resume{files.length !== 1 ? "s" : ""} stored for this session</CardDescription>
				</CardHeader>
				<CardContent className="pt-6">
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{files.map((file) => (
							<div key={file.fileId} className="rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 dark:bg-muted/20">
								<div className="flex items-center gap-3.5">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><FileText className="size-5 text-primary/80" /></div>
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-foreground" title={file.originalName}>{file.originalName}</p>
										<p className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(Number(file.size))}</p>
									</div>
								</div>
								<div className="mt-4 flex flex-wrap gap-2">
									<Button
										size="sm"
										variant="outline"
										onClick={() => {
											void openSessionFile({ sessionId, fileId: file.fileId }).catch(error => {
												toast.error(getErrorMessage(error, "Could not open file"))
											})
										}}
									>
										View file
									</Button>
									<Button
										size="sm"
										variant="secondary"
										onClick={() => {
											void downloadSessionFile({ sessionId, fileId: file.fileId }).catch(error => {
												toast.error(getErrorMessage(error, "Could not download file"))
											})
										}}
									>
										<FileDown className="size-4" />
										Download
									</Button>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</section>
	)
}
