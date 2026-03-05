import { Link } from "react-router-dom"
import { toast } from "sonner"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { Briefcase, FileText, Search, Plus } from "lucide-react"

import { api } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getEdenErrorMessage, getErrorMessage } from "@/lib/errors"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

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

export default function ProfilingSessionsPage() {
	const [sessions, setSessions] = useState<ProfilingSession[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [activeTab, setActiveTab] = useState("all")
	const [searchQuery, setSearchQuery] = useState("")

	useEffect(() => {
		void fetchSessions()
	}, [])

	const fetchSessions = async () => {
		try {
			setIsLoading(true)
			const { data, error } = await api.api.v2.sessions.get()
			
			if (error || !data) {
				const message = getEdenErrorMessage(error) ?? "Could not load sessions"
				toast.error(message)
				return
			}

			setSessions(data.sessions)
		}
		catch (err) {
			toast.error(getErrorMessage(err, "Failed to load sessions"))
			console.error("[ProfilingSessions] Fetch error:", err)
		}
		finally {
			setIsLoading(false)
		}
	}

	const filteredSessions = sessions.filter(session => {
		const matchesTab = activeTab === "all" || session.status === activeTab
		const matchesSearch = session.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
			(session.jobTitle && session.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()))
			
		return matchesTab && matchesSearch
	})

	return (
		<motion.div 
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="flex flex-col gap-8"
		>
			<section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">Profiling Sessions</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Manage your resume analysis history and track ongoing jobs.
					</p>
				</div>
				<Button asChild className="gap-2 shadow-sm">
					<Link to="/profiling/new">
						<Plus className="size-4" /> New Session
					</Link>
				</Button>
			</section>

			<Card className="border-none shadow-md">
				<CardHeader className="border-b border-border/30 pb-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								All Sessions
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								{sessions.length} total sessions across all statuses.
							</CardDescription>
						</div>
						
						<div className="flex items-center gap-2">
							<div className="relative">
								<Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
								<Input
									type="search"
									placeholder="Search sessions..."
									className="w-full sm:w-64 pl-8 bg-muted/40"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
						</div>
					</div>
					
					<Tabs defaultValue="all" className="w-full mt-4" onValueChange={setActiveTab}>
						<TabsList className="bg-muted/40 w-full justify-start overflow-x-auto">
							<TabsTrigger value="all" className="rounded-md">All</TabsTrigger>
							<TabsTrigger value="completed" className="rounded-md">Completed</TabsTrigger>
							<TabsTrigger value="processing" className="rounded-md">Processing</TabsTrigger>
							<TabsTrigger value="failed" className="rounded-md">Failed</TabsTrigger>
						</TabsList>
					</Tabs>
				</CardHeader>
				
				<CardContent className="p-0">
					<Table>
						<TableHeader className="bg-muted/20">
							<TableRow>
								<TableHead className="pl-6">Session</TableHead>
								<TableHead>Job Title</TableHead>
								<TableHead className="hidden sm:table-cell">Created</TableHead>
								<TableHead className="hidden md:table-cell">Files</TableHead>
								<TableHead className="pr-6">Status</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
										<div className="flex flex-col items-center justify-center gap-2">
											<div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
											Loading sessions...
										</div>
									</TableCell>
								</TableRow>
							) : filteredSessions.length === 0 ? (
								<TableRow>
									<TableCell colSpan={5} className="h-48 text-center text-muted-foreground">
										No sessions found.
									</TableCell>
								</TableRow>
							) : (
								filteredSessions.map((session) => (
									<TableRow 
										key={session.id} 
										className="group cursor-pointer transition-all hover:bg-muted/50 dark:hover:bg-muted/20"
									>
										<TableCell className="pl-6 font-semibold text-foreground">
											<div className="flex items-center gap-3">
												<div className="hidden sm:flex shrink-0 size-8 rounded-md bg-primary/10 items-center justify-center">
													<Briefcase className="size-4 text-primary" />
												</div>
												<Link
													to={`/profiling/${session.id}`}
													className="hover:text-primary transition-colors hover:underline underline-offset-4 decoration-primary/30"
												>
													{session.name}
												</Link>
											</div>
										</TableCell>
										<TableCell className="font-medium text-muted-foreground group-hover:text-foreground transition-colors">
											{session.jobTitle || "—"}
										</TableCell>
										<TableCell className="hidden sm:table-cell text-muted-foreground text-sm truncate">
											{formatDistanceToNow(session.createdAt)}
										</TableCell>
										<TableCell className="hidden md:table-cell text-muted-foreground">
											<div className="flex items-center gap-1.5">
												<FileText className="size-3.5" />
												{session.totalFiles}
											</div>
										</TableCell>
										<TableCell className="pr-6">
											<Badge 
												variant={
													session.status === "completed" ? "secondary" : 
													session.status === "processing" ? "default" : 
													session.status === "failed" ? "destructive" : "outline"
												}
												className="shadow-sm capitalize"
											>
												{session.status}
											</Badge>
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
