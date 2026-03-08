import { ArrowLeft, Download, Loader2, RefreshCw, RotateCcw } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ProfilingSession } from "@/lib/profiling-queries"

import type { RetryMode } from "./session-utils"
import { statusBadgeVariant, statusLabel } from "./session-utils"

type SessionHeaderProps = {
	session: ProfilingSession
	isCompleted: boolean
	isFailed: boolean
	isExporting: boolean
	onBack: () => void
	onExport: () => void
	onOpenRetry: (mode: RetryMode) => void
}

export function SessionHeader({
	session,
	isCompleted,
	isFailed,
	isExporting,
	onBack,
	onExport,
	onOpenRetry,
}: SessionHeaderProps) {
	return (
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
					<Button variant="ghost" size="icon" className="-ml-2 mr-1 size-8 shrink-0" onClick={onBack}>
						<ArrowLeft className="size-5" />
					</Button>
					<h1 className="head-text-md text-foreground">{session.name}</h1>
				</div>
				<p className="ml-10 text-sm text-muted-foreground">Session ID {session.id.substring(0, 8)} • {session.jobTitle || "Custom role brief"}</p>
				<p className="ml-10 max-w-4xl text-sm text-muted-foreground line-clamp-2">{session.jobDescription}</p>
			</div>

			<div className="flex flex-wrap items-center gap-2">
				{isCompleted && (
					<Button size="sm" className="gap-2" onClick={onExport} disabled={isExporting}>
						{isExporting ? <Loader2 className="size-4 animate-spin" /> : "Export results"}
						<Download className="size-4" />
					</Button>
				)}
				{isFailed && (
					<Button size="sm" variant="secondary" className="gap-2" onClick={() => onOpenRetry("rerun_current")}>
						<RefreshCw className="size-4" />
						Retry now
					</Button>
				)}
				{isCompleted && (
					<Button size="sm" variant="outline" className="gap-2" onClick={() => onOpenRetry("clone_current")}>
						<RotateCcw className="size-4" />
						Retry options
					</Button>
				)}
			</div>
		</section>
	)
}
