import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Session = {
	id: string
	name: string
	jobTitle: string
	createdAt: string
	resumes: number
	status: string
}

type DashboardRecentSessionsProps = {
	sessions: readonly Session[]
}

export function DashboardRecentSessions({ sessions }: DashboardRecentSessionsProps) {
	return (
		<Card className="h-full border-none shadow-md">
			<CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/30 pb-4">
				<div>
					<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Recent Profiling Sessions</CardTitle>
					<CardDescription className="text-sm mt-1">Track recent screening work without having to stay on any one session page.</CardDescription>
				</div>
				<Button asChild size="sm" className="relative transition-all before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-linear-to-b before:from-primary/5 before:to-primary/10 before:opacity-80 before:duration-300">
					<Link to="/profiling/new">New Session</Link>
				</Button>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Session</TableHead>
							<TableHead>Job Title</TableHead>
							<TableHead className="hidden sm:table-cell">Created</TableHead>
							<TableHead className="hidden md:table-cell">Resumes</TableHead>
							<TableHead>Status</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{sessions.map((session) => (
							<TableRow key={session.id} className="group cursor-pointer transition-all hover:bg-muted/50 dark:hover:bg-muted/20">
								<TableCell className="font-semibold text-foreground">
									<Link to={`/profiling/${session.id}`} className="hover:text-primary transition-colors hover:underline underline-offset-4 decoration-primary/30">{session.name}</Link>
								</TableCell>
								<TableCell className="font-medium group-hover:text-foreground transition-colors">{session.jobTitle}</TableCell>
								<TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{session.createdAt}</TableCell>
								<TableCell className="hidden md:table-cell text-muted-foreground">{session.resumes}</TableCell>
								<TableCell>
									<Badge variant={session.status === "completed" ? "secondary" : session.status === "processing" || session.status === "retrying" ? "default" : "outline"} className="capitalize shadow-sm">
										{session.status === "processing" ? "queued" : session.status === "retrying" ? "refreshing" : session.status}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
					<TableCaption>Background sessions refresh automatically while they are active.</TableCaption>
				</Table>
			</CardContent>
		</Card>
	)
}
