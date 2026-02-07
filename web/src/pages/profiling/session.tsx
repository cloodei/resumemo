import { toast } from "sonner"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
	ArrowLeft,
	ArrowUpRight,
	Download,
	FileText,
	Loader2,
	Mail,
	RefreshCw,
	Sparkles,
	AlertCircle,
	UploadCloud,
} from "lucide-react"

import { api } from "@/lib/api"
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

type ProfilingSession = {
	id: string
	name: string
	jobTitle: string | null
	jobDescription: string
	status: "uploading" | "ready" | "processing" | "completed" | "failed"
	totalFiles: number
	errorMessage: string | null
	createdAt: string
}

type SessionFile = {
	id: string
	originalName: string
	mimeType: string
	size: number
}

function statusBadgeVariant(status: ProfilingSession["status"]) {
	switch (status) {
		case "uploading":
			return "secondary"
		case "ready":
			return "outline"
		case "processing":
			return "secondary"
		case "completed":
			return "outline"
		case "failed":
			return "destructive"
	}
}

export default function ProfilingResultsPage() {
	const { id } = useParams<{ id: string }>()
	const navigate = useNavigate()
	const [session, setSession] = useState<ProfilingSession>()
	const [files, setFiles] = useState<SessionFile[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [isStarting, setIsStarting] = useState(false)

	useEffect(() => {
		if (id) {
			void fetchSession()
		}
	}, [id])

	const fetchSession = async () => {
		try {
			const { data, error } = await api.api.sessions({ id: id! }).get()

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
			setFiles((data.files || []) as SessionFile[])
		} catch (err) {
			toast.error("Failed to load profiling session")
			console.error(err)
		} finally {
			setIsLoading(false)
		}
	}

	const startProfiling = async () => {
		if (!id) return

		setIsStarting(true)
		try {
			const { data, error } = await api.api.sessions({ id }).start.post()

			if (error || !data) {
				const errorData = error as { message?: string } | undefined
				throw new Error(errorData?.message || "Failed to start profiling")
			}

			toast.success("Profiling started!")
			fetchSession()
		} catch (err) {
			const message = err instanceof Error ? err.message : "Failed to start"
			toast.error(message)
		} finally {
			setIsStarting(false)
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

	const isUploading = session.status === "uploading"
	const isReady = session.status === "ready"
	const isProcessing = session.status === "processing"
	const isCompleted = session.status === "completed"
	const isFailed = session.status === "failed"

	return (
		<div className="flex flex-col gap-8">
			{/* Header */}
			<motion.section
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-col gap-4"
			>
				<div className="flex items-center gap-2">
					<Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
						<ArrowLeft className="size-4 mr-1" />
						Dashboard
					</Button>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<Badge variant={statusBadgeVariant(session.status)} className="text-xs uppercase tracking-widest">
						{session.status}
					</Badge>
					<p className="text-sm text-muted-foreground">
						Created {new Date(session.createdAt).toLocaleDateString()}
					</p>
				</div>

				<div className="flex flex-col gap-2">
					<h1 className="head-text-md text-foreground">{session.name}</h1>
					{session.jobTitle && (
						<p className="text-sm font-medium text-muted-foreground">{session.jobTitle}</p>
					)}
					<p className="text-sm text-muted-foreground max-w-3xl line-clamp-2">
						{session.jobDescription}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					{isCompleted && (
						<Button size="sm" className="gap-2">
							<Download className="size-4" />
							Export Results
						</Button>
					)}
					<Button size="sm" variant="outline" className="gap-2">
						<Mail className="size-4" />
						Share
					</Button>
					<Button size="sm" variant="ghost" className="gap-2">
						<ArrowUpRight className="size-4" />
						View Details
					</Button>
				</div>
			</motion.section>

			{/* Uploading state */}
			{isUploading && (
				<motion.section
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="flex flex-col items-center justify-center py-16 text-center"
				>
					<div className="size-20 rounded-full bg-sky-500/10 flex items-center justify-center mb-6">
						<UploadCloud className="size-10 text-sky-500 animate-pulse" />
					</div>
					<h2 className="text-2xl font-semibold mb-2">Upload in Progress</h2>
					<p className="text-muted-foreground max-w-md mb-6">
						{session.totalFiles} file{session.totalFiles !== 1 ? "s" : ""} are being uploaded. This page
						will update once the upload is confirmed.
					</p>
					<Button variant="outline" onClick={fetchSession} className="gap-2">
						<RefreshCw className="size-4" />
						Refresh
					</Button>
				</motion.section>
			)}

			{/* Ready state */}
			{isReady && (
				<motion.section
					initial={{ opacity: 0, scale: 0.95 }}
					animate={{ opacity: 1, scale: 1 }}
					className="flex flex-col items-center justify-center py-16 text-center"
				>
					<div className="size-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-6">
						<Sparkles className="size-10 text-violet-500" />
					</div>
					<h2 className="text-2xl font-semibold mb-2">Ready to Profile</h2>
					<p className="text-muted-foreground max-w-md mb-6">
						{session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""} uploaded and ready to be
						analyzed against your job description.
					</p>
					<Button size="lg" onClick={startProfiling} disabled={isStarting} className="gap-2">
						{isStarting ? (
							<>
								<Loader2 className="size-4 animate-spin" />
								Starting...
							</>
						) : (
							<>
								<Sparkles className="size-4" />
								Start AI Profiling
							</>
						)}
					</Button>
				</motion.section>
			)}

			{/* Processing state */}
			{isProcessing && (
				<motion.section
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center justify-center py-16 text-center"
				>
					<div className="w-full max-w-md">
						<div className="size-20 rounded-full bg-sky-500/10 flex items-center justify-center mb-6 mx-auto">
							<Loader2 className="size-10 text-sky-500 animate-spin" />
						</div>
						<h2 className="text-2xl font-semibold mb-2">Profiling in Progress</h2>
						<p className="text-muted-foreground mb-4">
							AI is analyzing {session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""}...
						</p>
						<p className="text-xs text-muted-foreground">
							This may take a few minutes. You can leave and come back.
						</p>
					</div>
				</motion.section>
			)}

			{/* Failed state */}
			{isFailed && (
				<motion.section
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="flex flex-col items-center justify-center py-16 text-center"
				>
					<div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
						<AlertCircle className="size-10 text-destructive" />
					</div>
					<h2 className="text-2xl font-semibold mb-2">Session Failed</h2>
					<p className="text-muted-foreground max-w-md mb-2">Something went wrong with this session.</p>
					{session.errorMessage && (
						<p className="text-sm text-destructive mb-6 max-w-md">{session.errorMessage}</p>
					)}
					<div className="flex gap-3">
						<Button variant="outline" onClick={() => navigate("/profiling/new")}>
							Create New Session
						</Button>
					</div>
				</motion.section>
			)}

			{/* Completed state — placeholder until AI pipeline exists */}
			{isCompleted && (
				<motion.section
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.2 }}
				>
					<Card className="shadow-x border-none">
						<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4">
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Results
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								{session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""} analyzed
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-6 text-sm text-muted-foreground">
							<p>
								AI scoring and ranking results will appear here once the profiling pipeline is
								implemented.
							</p>
						</CardContent>
					</Card>
				</motion.section>
			)}

			{/* File list — shown for all states */}
			{files.length > 0 && (
				<motion.section
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
				>
					<Card className="shadow-m border-border/60 dark:border-border/40">
						<CardHeader className="border-b border-border/50 dark:border-border/30 pb-4">
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Session Files
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								{files.length} file{files.length !== 1 ? "s" : ""} in this session
							</CardDescription>
						</CardHeader>
						<CardContent className="pt-4">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{files.map((file) => (
									<div
										key={file.id}
										className="rounded-lg bg-muted/30 dark:bg-muted/20 p-4 shadow-m"
									>
										<div className="flex items-center gap-3">
											<div className="shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center">
												<FileText className="size-5 text-primary" />
											</div>
											<div className="min-w-0">
												<p className="font-medium text-sm text-foreground truncate">
													{file.originalName}
												</p>
												<p className="text-xs text-muted-foreground">
													{formatFileSize(file.size)}
												</p>
											</div>
										</div>
									</div>
								))}
							</div>
						</CardContent>
						<CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 py-4 text-xs text-muted-foreground">
							<span>{files.length} total files</span>
							<Button size="sm" variant="secondary" className="gap-2">
								<Download className="size-4" />
								Download CSV
							</Button>
						</CardFooter>
					</Card>
				</motion.section>
			)}
		</div>
	)
}
