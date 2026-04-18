import { useMemo, Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"
import { motion } from "motion/react"
import { Briefcase, FileText, Plus, Search } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { QueryErrorBoundary } from "@/components/feedback/query-error-boundary"
import { RouteErrorFallback } from "@/components/feedback/route-error-fallback"
import { ProfilingSessionsSkeleton } from "@/components/feedback/route-skeletons"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { profilingSessionsQueryOptions, type ProfilingSession } from "@/features/profiling/profiling-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

function formatDistanceToNow(date: Date) {
	const now = Date.now()
	const diff = date.getTime() - now
	const daysDifference = Math.round(diff / (1000 * 60 * 60 * 24))

	if (Math.abs(daysDifference) > 0)
		return rtf.format(daysDifference, "day")

	const hoursDifference = Math.round(diff / (1000 * 60 * 60))
	if (Math.abs(hoursDifference) > 0)
		return rtf.format(hoursDifference, "hour")

	const minutesDifference = Math.round(diff / (1000 * 60))
	return rtf.format(minutesDifference, "minute")
}

function statusLabel(status: ProfilingSession["status"]) {
	switch (status) {
		case "processing":
			return "Queued"
		case "retrying":
			return "Refreshing"
		case "completed":
			return "Completed"
		case "failed":
			return "Needs attention"
	}
}

function statusDescription(status: ProfilingSession["status"]) {
	switch (status) {
		case "processing":
			return "Running in the background"
		case "retrying":
			return "Refreshing this session"
		case "completed":
			return "Ready to review"
		case "failed":
			return "Retry available"
	}
}

function statusVariant(status: ProfilingSession["status"]) {
	if (status === "completed")
		return "secondary"
	if (status === "failed")
		return "destructive"
	return "default"
}

function ProfilingSessionsContent() {
	const { data: sessions } = useSuspenseQuery(profilingSessionsQueryOptions())
	const [searchParams, setSearchParams] = useSearchParams()
	const activeTab = searchParams.get("status") ?? "all"
	const searchQuery = searchParams.get("q") ?? ""

	const filteredSessions = useMemo(() => {
		return sessions.filter((session) => {
			const matchesTab = activeTab === "all" || session.status === activeTab
			const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase())
				|| Boolean(session.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase()))

			return matchesTab && matchesSearch
		})
	}, [activeTab, searchQuery, sessions])

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="flex flex-col gap-8"
		>
			<section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Profiling sessions</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Sessions run as background jobs, so you can leave and come back when scoring is ready.
					</p>
				</div>
				<Button asChild className="gap-2 shadow-sm">
					<Link to="/profiling/new">
						<Plus className="size-4" /> New session
					</Link>
				</Button>
			</section>

			<Card className="border-none shadow-md">
				<CardHeader className="border-b border-border/30 pb-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle className="bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-lg font-semibold">
								All sessions
							</CardTitle>
							<CardDescription className="mt-1 text-sm">
								{sessions.length} total sessions across every state.
							</CardDescription>
						</div>

						<div className="relative">
							<Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
							<Input
								type="search"
								placeholder="Search sessions..."
								className="w-full bg-muted/40 pl-8 sm:w-64"
								value={searchQuery}
								onChange={(event) => {
									const next = new URLSearchParams(searchParams)
									if (event.target.value)
										next.set("q", event.target.value)
									else
										next.delete("q")
									setSearchParams(next, { replace: true })
								}}
							/>
						</div>
					</div>

					<Tabs
						value={activeTab}
						onValueChange={(value) => {
							const next = new URLSearchParams(searchParams)
							if (value === "all")
								next.delete("status")
							else
								next.set("status", value)
							setSearchParams(next, { replace: true })
						}}
						className="mt-4 w-full"
					>
						<TabsList className="w-full justify-start overflow-x-auto bg-muted/40">
							<TabsTrigger value="all" className="rounded-md">All</TabsTrigger>
							<TabsTrigger value="completed" className="rounded-md">Completed</TabsTrigger>
							<TabsTrigger value="processing" className="rounded-md">Queued</TabsTrigger>
							<TabsTrigger value="retrying" className="rounded-md">Refreshing</TabsTrigger>
							<TabsTrigger value="failed" className="rounded-md">Needs attention</TabsTrigger>
						</TabsList>
					</Tabs>
				</CardHeader>

				<CardContent className="p-0">
					<Table>
						<TableHeader className="bg-muted/20">
							<TableRow>
								<TableHead className="pl-6">Session</TableHead>
								<TableHead>Role</TableHead>
								<TableHead className="hidden sm:table-cell">Created</TableHead>
								<TableHead className="hidden md:table-cell">Files</TableHead>
								<TableHead className="pr-6">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{filteredSessions.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
										No sessions match this view.
									</TableCell>
								</TableRow>
							) : (
								filteredSessions.map((session) => (
									<TableRow key={session.id} className="group cursor-pointer transition-all hover:bg-muted/50 dark:hover:bg-muted/20">
										<TableCell className="pl-6 font-semibold text-foreground">
											<div className="flex items-center gap-3">
												<div className="hidden size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 sm:flex">
													<Briefcase className="size-4 text-primary" />
												</div>
												<Link to={`/profiling/${session.id}`} className="hover:text-primary hover:underline decoration-primary/30 underline-offset-4 transition-colors">
													{session.name}
												</Link>
											</div>
										</TableCell>
										<TableCell className="font-medium text-muted-foreground transition-colors group-hover:text-foreground">
											{session.jobTitle || "Custom brief"}
										</TableCell>
										<TableCell className="hidden truncate text-sm text-muted-foreground sm:table-cell">
											{formatDistanceToNow(new Date(session.createdAt))}
										</TableCell>
										<TableCell className="hidden text-muted-foreground md:table-cell">
											<div className="flex items-center gap-1.5">
												<FileText className="size-3.5" />
												{session.totalFiles}
											</div>
										</TableCell>
										<TableCell className="pr-6">
											<div className="flex flex-col gap-1">
												<Badge variant={statusVariant(session.status)} className="w-fit capitalize shadow-sm">
													{statusLabel(session.status)}
												</Badge>
												<span className="text-xs text-muted-foreground">{statusDescription(session.status)}</span>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</motion.div>
	)
}

export default function ProfilingSessionsPage() {
	return (
		<QueryErrorBoundary
			fallback={(
				<RouteErrorFallback
					title="Could not load profiling sessions"
					description="The session list is unavailable right now. You can retry this view or head back to the dashboard."
					secondaryHref="/dashboard"
					secondaryLabel="Back to dashboard"
				/>
			)}
		>
			<Suspense fallback={<ProfilingSessionsSkeleton />}>
				<ProfilingSessionsContent />
			</Suspense>
		</QueryErrorBoundary>
	)
}
