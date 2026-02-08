import { toast } from "sonner"
import { useState, useEffect, useCallback } from "react"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { useForm } from "react-hook-form"
import {
	ArrowRight,
	CheckCircle2,
	FileText,
	Hash,
	Layers,
	Loader2,
	RefreshCw,
	UploadCloud,
	X,
} from "lucide-react"

import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { formatFileSize } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MAX_BATCH_SIZE, MAX_FILE_SIZE, ALLOWED_MIME_TYPES_STRING } from "@/lib/constants"
import { useUploadFiles, useUploadPhase, useUploadActions, type FileStatus } from "@/stores/upload-store"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

const steps = [
	{
		id: 1,
		title: "Describe the role",
		description: "Provide a job description and session name.",
	},
	{
		id: 2,
		title: "Add resumes",
		description: "Drag & drop PDF, DOCX, or TXT files.",
	},
	{
		id: 3,
		title: "Upload & create",
		description: "Files are uploaded and your session is created.",
	},
]

const jdTemplates = [
	{
		title: "Senior Frontend Engineer",
		summary: "React, TypeScript, accessibility, and design systems.",
	},
	{
		title: "AI Research Scientist",
		summary: "Model deployment, LLM tuning, and experimentation cadence.",
	},
]

function fileStatusLabel(status: FileStatus, errorMessage?: string) {
	switch (status) {
		case "selected":
			return "Queued"
		case "hashing":
			return "Preparing..."
		case "ready":
			return "Ready"
		case "uploading":
			return "Uploading..."
		case "uploaded":
			return "Uploaded"
		case "reused":
			return "Already on file"
		case "failed":
			return errorMessage ?? "Failed"
	}
}

function fileStatusIcon(status: FileStatus) {
	switch (status) {
		case "selected":
			return <FileText className="size-4 text-muted-foreground" />
		case "hashing":
			return <Hash className="size-4 animate-pulse text-amber-500" />
		case "ready":
			return <CheckCircle2 className="size-4 text-sky-500" />
		case "uploading":
			return <Loader2 className="size-4 animate-spin text-sky-500" />
		case "uploaded":
		case "reused":
			return <CheckCircle2 className="size-4 text-emerald-500" />
		case "failed":
			return <X className="size-4 text-destructive" />
	}
}

type SessionFormData = {
	sessionName: string
	jobTitle: string
	jobDescription: string
}

export default function NewProfilingPage() {
	const navigate = useNavigate()
	const files = useUploadFiles()
	const phase = useUploadPhase()
	const { addFiles, removeFile, clearAll, updateFile, setPhase, hashFiles } = useUploadActions()

	const [isDragging, setIsDragging] = useState(false)

	const {
		register,
		handleSubmit,
		setValue,
		formState: { errors },
	} = useForm<SessionFormData>({
		defaultValues: {
			sessionName: "",
			jobTitle: "",
			jobDescription: "",
		},
	})

	useEffect(() => {
		const hasUnhashed = files.some(f => f.status === "selected" && !f.fingerprint)
		if (hasUnhashed) {
			hashFiles()
		}
	}, [files])

	const readyFiles = files.filter(f => f.status === "ready" || f.status === "uploaded" || f.status === "reused")
	const failedFiles = files.filter(f => f.status === "failed")
	const hashingFiles = files.filter(f => f.status === "hashing" || f.status === "selected")
	const allFilesReady = files.length > 0 && hashingFiles.length === 0
	const isBusy = phase !== "idle" && phase !== "done" && phase !== "error"

	const handleAddFiles = useCallback(
		(newFiles: File[]) => {
			if (isBusy) return

			if (files.length + newFiles.length > MAX_BATCH_SIZE) {
				toast.error(`Maximum ${MAX_BATCH_SIZE} files allowed per batch`)
				return
			}

			const validFiles: File[] = []
			for (const file of newFiles) {
				if (!ALLOWED_MIME_TYPES_STRING.includes(file.type)) {
					toast.error(`${file.name}: Only PDF, DOCX, and TXT allowed`)
					continue
				}
				if (file.size > MAX_FILE_SIZE) {
					toast.error(`${file.name}: File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`)
					continue
				}
				if (files.some(f => f.originalName === file.name && f.size === file.size)) {
					toast.error(`${file.name}: Already added`)
					continue
				}
				validFiles.push(file)
			}

			if (validFiles.length > 0) {
				addFiles(validFiles)
			}
		},
		[files, isBusy, addFiles],
	)

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragging(false)
		handleAddFiles(Array.from(e.dataTransfer.files))
	}

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = e.target.files ? Array.from(e.target.files) : []
		handleAddFiles(selectedFiles)
		e.target.value = ""
	}

	const onSubmit = async (data: SessionFormData) => {
		if (!allFilesReady || files.length === 0) {
			toast.error("Please add files and wait for them to be ready")
			return
		}

		const filesToUpload = files.filter(f => f.status === "ready" && f.fingerprint)
		if (filesToUpload.length === 0) {
			toast.error("No files ready for upload")
			return
		}

		try {
			// Phase 1: Create session + get presigned URLs
			setPhase("creating")

			const { data: responseData, error } = await api.api.sessions.post({
				name: data.sessionName.trim(),
				jobTitle: data.jobTitle.trim() || undefined,
				jobDescription: data.jobDescription.trim(),
				files: filesToUpload.map(f => ({
					name: f.originalName,
					size: f.size,
					mimeType: f.mimeType,
					fingerprint: f.fingerprint!,
				})),
			})

			if (error || !responseData) {
				throw new Error("Failed to create session")
			}

			const { session, newUploads, reusedFiles } = responseData as {
				session: { id: string }
				newUploads: { id: string; originalName: string; uploadUrl: string; storageKey: string }[]
				reusedFiles: { id: string; originalName: string }[]
			}

			// Mark reused files in the store
			for (const reused of reusedFiles) {
				const storeFile = filesToUpload.find(f => f.originalName === reused.originalName)
				if (storeFile) {
					updateFile(storeFile.id, { status: "reused", serverId: reused.id, progress: 100 })
				}
			}

			// Phase 2: Upload new files to R2
			setPhase("uploading")

			const uploadResults: { fileId: string; success: boolean }[] = []

			// Mark reused files as confirmed immediately
			for (const reused of reusedFiles) {
				uploadResults.push({ fileId: reused.id, success: true })
			}

			// Upload new files in parallel
			await Promise.all(
				newUploads.map(async (upload) => {
					const storeFile = filesToUpload.find(f => f.originalName === upload.originalName)
					if (!storeFile?.file) {
						uploadResults.push({ fileId: upload.id, success: false })
						return
					}

					updateFile(storeFile.id, { status: "uploading", serverId: upload.id })

					try {
						const xhr = new XMLHttpRequest()

						await new Promise<void>((resolve, reject) => {
							xhr.upload.addEventListener("progress", (event) => {
								if (event.lengthComputable) {
									const progress = Math.round((event.loaded / event.total) * 100)
									updateFile(storeFile.id, { progress })
								}
							})

							xhr.addEventListener("load", () => {
								if (xhr.status >= 200 && xhr.status < 300) resolve()
								else reject(new Error(`Upload returned ${xhr.status}`))
							})

							xhr.addEventListener("error", () => reject(new Error("Network error")))

							xhr.open("PUT", upload.uploadUrl)
							xhr.setRequestHeader("Content-Type", storeFile.mimeType)
							xhr.send(storeFile.file)
						})

						updateFile(storeFile.id, { status: "uploaded", progress: 100 })
						uploadResults.push({ fileId: upload.id, success: true })
					} catch (err) {
						const msg = err instanceof Error ? err.message : "Upload failed"
						updateFile(storeFile.id, { status: "failed", errorMessage: msg })
						uploadResults.push({ fileId: upload.id, success: false })
					}
				}),
			)

			// Phase 3: Confirm the upload
			setPhase("confirming")

			const uploadedFileIds = uploadResults
				.filter(r => r.success)
				.map(r => r.fileId)

			const { error: confirmError } = await api.api.sessions({ id: session.id }).confirm.post({
				uploadedFileIds,
			})

			if (confirmError) {
				throw new Error("Failed to confirm upload")
			}

			const failedCount = uploadResults.filter(r => !r.success).length

			setPhase("done")

			if (failedCount > 0) {
				toast.warning(
					`Session created with ${uploadedFileIds.length} file${uploadedFileIds.length !== 1 ? "s" : ""}. ${failedCount} file${failedCount !== 1 ? "s" : ""} failed.`,
				)
			} else {
				toast.success("Session created successfully!")
			}

			// Small delay so the user sees the "done" state before navigation
			setTimeout(() => {
				clearAll()
				navigate(`/profiling/${session.id}`)
			}, 1200)
		} catch (err) {
			setPhase("error")
			toast.error(err instanceof Error ? err.message : "Something went wrong")
			console.error(err)
		}
	}

	const canCreate = allFilesReady && files.length > 0 && !isBusy

	const phaseLabel = {
		idle: "",
		hashing: "Preparing files...",
		creating: "Setting up your session...",
		uploading: "Uploading files to cloud storage...",
		confirming: "Finalizing your session...",
		done: "All done! Redirecting...",
		error: "Something went wrong. You can retry.",
	}

	return (
		<div className="flex flex-col gap-8">
			{/* Header with step cards */}
			<motion.section
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
				className="flex flex-col gap-4"
			>
				<div className="flex flex-col gap-2">
					<Badge className="w-fit bg-linear-to-br from-sky-500/80 to-violet-500/90 text-neutral-100">
						Create a new profiling session
					</Badge>
					<h1 className="head-text-md text-foreground">Describe, upload, and launch</h1>
					<p className="max-w-2xl text-sm text-muted-foreground">
						Set up your job description, add candidate resumes, and create a session. Files are securely uploaded to cloud storage.
					</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					{steps.map((step) => (
						<Card
							key={step.id}
							className="group relative overflow-hidden transition-all border-dashed dark:hover:border-transparent shadow-m hover:shadow-l hover:border-primary/30 hover:-translate-y-0.5"
						>
							<CardHeader className="gap-2">
								<CardTitle className="flex items-center gap-2 text-base font-semibold">
									<span className="flex size-7 items-center justify-center rounded-full bg-muted shadow-m font-medium group-hover:bg-primary/10 group-hover:text-primary transition-colors">
										{step.id}
									</span>
									{step.title}
								</CardTitle>
								<CardDescription>{step.description}</CardDescription>
							</CardHeader>
						</Card>
					))}
				</div>
			</motion.section>

			{/* Main content: Job description + Resume upload */}
			<motion.section
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3, duration: 0.5 }}
				className="grid gap-6 lg:grid-cols-2"
			>
				{/* Job Description Card */}
				<Card className="shadow-x border-none">
					<CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
						<div>
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Job description
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								Paste your job description or choose from templates.
							</CardDescription>
						</div>
						<Button variant="outline" size="sm" className="shadow-m hover:shadow-l transition-all">
							Import from library
						</Button>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Session name — required */}
						<div className="grid gap-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-foreground" htmlFor="session-name">
									Session name
								</label>
								{errors.sessionName && (
									<span className="text-xs text-destructive">{errors.sessionName.message}</span>
								)}
							</div>
							<Input
								id="session-name"
								placeholder="e.g. Q1 Frontend Hiring"
								className="h-11"
								disabled={isBusy}
								{...register("sessionName", {
									required: "Session name is required",
									minLength: { value: 3, message: "Min 3 characters" },
								})}
							/>
						</div>

						<div className="grid gap-3">
							<label className="text-sm font-medium text-foreground" htmlFor="job-title">
								Job title
							</label>
							<Input
								id="job-title"
								placeholder="e.g. Staff Product Designer"
								className="h-11"
								disabled={isBusy}
								{...register("jobTitle")}
							/>
						</div>

						<div className="grid gap-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-foreground" htmlFor="job-description">
									Job description detail
								</label>
							</div>
							<Textarea
								id="job-description"
								placeholder="Describe responsibilities, skills, and must-have experience..."
								className="min-h-[180px] resize-none"
								disabled={isBusy}
								{...register("jobDescription", {
									required: "Job description is required",
									minLength: { value: 50, message: "Min 50 characters" },
								})}
							/>
							{errors.jobDescription && (
								<span className="text-xs text-destructive">{errors.jobDescription.message}</span>
							)}
						</div>

						<Tabs defaultValue="templates" className="pt-2">
							<TabsList>
								<TabsTrigger className="border-none cursor-pointer" value="templates">
									Templates
								</TabsTrigger>
								<TabsTrigger className="border-none cursor-pointer" value="history">
									Recent sessions
								</TabsTrigger>
							</TabsList>
							<TabsContent value="templates" className="mt-4 grid gap-3 md:grid-cols-2">
								{jdTemplates.map((template) => (
									<div
										key={template.title}
										className="group rounded-lg border border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-l hover:-translate-y-0.5 cursor-pointer"
										onClick={() => {
											setValue("jobTitle", template.title)
											setValue("jobDescription", template.summary + "\n\nAdd more details about the role...")
										}}
									>
										<p className="font-semibold text-foreground group-hover:text-primary transition-colors">
											{template.title}
										</p>
										<p className="mt-2 text-xs leading-5 text-muted-foreground">{template.summary}</p>
										<Button size="sm" variant="ghost" className="mt-4 h-9 px-3">
											Use template
										</Button>
									</div>
								))}
							</TabsContent>
							<TabsContent value="history" className="mt-4 space-y-3 text-sm text-muted-foreground">
								<p>Recently launched sessions will appear here to quickly duplicate configurations.</p>
								<Button size="sm" variant="outline" className="h-9 px-3">
									View session history
								</Button>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>

				{/* Resume Upload Card */}
				<Card className="border-dashed shadow-x">
					<CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
						<div>
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Resume upload
							</CardTitle>
							<CardDescription className="text-sm mt-1">
								Drop resumes to add them to your session.
							</CardDescription>
						</div>
						<Badge variant="outline" className="flex items-center gap-1 text-xs">
							<UploadCloud className="size-3.5" /> Cloud Upload
						</Badge>
					</CardHeader>
					<CardContent className="space-y-6">
						<motion.div
							onDragOver={(e) => {
								e.preventDefault()
								setIsDragging(true)
							}}
							onDragLeave={(e) => {
								e.preventDefault()
								setIsDragging(false)
							}}
							onDrop={handleDrop}
							whileHover={isBusy ? {} : { scale: 1.01 }}
							whileTap={isBusy ? {} : { scale: 0.995 }}
							className={`
								relative flex min-h-[200px] flex-col items-center justify-center gap-4
								rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center
								transition-colors duration-200
								${isBusy ? "pointer-events-none opacity-60" : "cursor-pointer"}
								${isDragging
									? "border-primary bg-primary/5"
									: "border-muted-foreground/40 hover:border-primary/50 hover:bg-muted/50"}
							`}
							onClick={() => !isBusy && document.getElementById("file-input")?.click()}
						>
							<input
								id="file-input"
								type="file"
								multiple
								accept=".pdf,.docx,.txt"
								onChange={handleFileSelect}
								className="hidden"
								disabled={isBusy}
							/>
							<div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
								<UploadCloud className="size-6" />
							</div>
							<div className="space-y-2">
								<p className="text-sm font-medium text-foreground">
									Drag & drop resumes or click to browse
								</p>
								<p className="text-xs text-muted-foreground">
									PDF, DOCX, TXT up to {MAX_FILE_SIZE / 1024 / 1024}MB each
								</p>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
								<span className="inline-flex items-center gap-1">
									<Layers className="size-3" /> Batch up to {MAX_BATCH_SIZE} files
								</span>
								<span className="inline-flex items-center gap-1">
									<FileText className="size-3" /> Duplicates auto-detected
								</span>
							</div>
							<Button
								size="sm"
								className="mt-2"
								disabled={isBusy}
								onClick={(e) => {
									e.stopPropagation()
									document.getElementById("file-input")?.click()
								}}
							>
								Browse files
							</Button>
						</motion.div>

						{files.length > 0 && (
							<div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
								<p className="flex items-center gap-2 text-foreground">
									{allFilesReady ? (
										<CheckCircle2 className="size-4 text-emerald-500" />
									) : (
										<Loader2 className="size-4 animate-spin text-sky-500" />
									)}
									{files.length} file{files.length !== 1 ? "s" : ""} in queue
									{hashingFiles.length > 0 && ` — preparing ${hashingFiles.length}...`}
									{allFilesReady && " — all ready"}
								</p>
								{failedFiles.length > 0 && (
									<p className="mt-1 text-xs text-destructive">
										{failedFiles.length} file{failedFiles.length !== 1 ? "s" : ""} could not be
										read. Remove and re-add them.
									</p>
								)}
							</div>
						)}
					</CardContent>
					<CardFooter className="justify-between">
						<div className="text-xs text-muted-foreground">
							Need help?{" "}
							<Link to="/support" className="underline">
								Check the upload guide
							</Link>
						</div>
					</CardFooter>
				</Card>
			</motion.section>

			{/* File queue + action footer */}
			<AnimatePresence>
				{files.length > 0 && (
					<motion.section
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.3 }}
					>
						<Card className="shadow-x border-none">
							<CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
								<div>
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
										File queue
									</CardTitle>
									<CardDescription className="text-sm mt-1">
										{files.length} file{files.length !== 1 ? "s" : ""} &bull;{" "}
										{readyFiles.length} ready
										{failedFiles.length > 0 && ` • ${failedFiles.length} failed`}
									</CardDescription>
								</div>
								<div className="flex items-center gap-2">
									{isBusy && (
										<Badge variant="secondary" className="flex items-center gap-1 text-xs">
											<Loader2 className="size-3 animate-spin" /> Working
										</Badge>
									)}
									<Button variant="ghost" size="sm" onClick={clearAll} disabled={isBusy}>
										Clear all
									</Button>
								</div>
							</CardHeader>
							<CardContent className="pt-4">
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
									{files.map((file) => (
										<motion.div
											key={file.id}
											layout
											initial={{ opacity: 0, scale: 0.95 }}
											animate={{ opacity: 1, scale: 1 }}
											exit={{ opacity: 0, scale: 0.9 }}
											transition={{ duration: 0.2 }}
											className="rounded-lg border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-3 min-w-0">
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
												<div className="flex items-center gap-1 shrink-0">
													{fileStatusIcon(file.status)}
													<Button
														variant="ghost"
														size="icon"
														className="size-7 hover:bg-destructive/10 hover:text-destructive"
														onClick={() => removeFile(file.id)}
														disabled={file.status === "uploading"}
													>
														<X className="size-4" />
													</Button>
												</div>
											</div>
											<div className="mt-3 space-y-1">
												{(file.status === "uploading" || file.status === "uploaded" || file.status === "reused") && (
													<Progress value={file.progress} className="h-1.5" />
												)}
												<div className="flex justify-between text-[10px] text-muted-foreground">
													<span>{fileStatusLabel(file.status, file.errorMessage)}</span>
													{(file.status === "uploading" || file.status === "uploaded") && (
														<span>{file.progress}%</span>
													)}
												</div>
											</div>
										</motion.div>
									))}
								</div>
							</CardContent>
							<CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-muted/20 py-4">
								{/* Phase status banner */}
								<div className="flex items-center gap-3 text-sm text-muted-foreground">
									{isBusy && <Loader2 className="size-4 animate-spin text-sky-500" />}
									{phase === "done" && <CheckCircle2 className="size-4 text-emerald-500" />}
									{phase === "error" && <X className="size-4 text-destructive" />}
									<span>{phaseLabel[phase]}</span>
								</div>

								<div className="flex items-center gap-3 w-full sm:w-auto">
									{phase === "error" && (
										<Button
											variant="secondary"
											className="flex-1 sm:flex-none gap-2"
											onClick={() => setPhase("idle")}
										>
											<RefreshCw className="size-4" />
											Reset
										</Button>
									)}
									<Button
										className="flex-1 sm:flex-none gap-2"
										disabled={!canCreate}
										onClick={handleSubmit(onSubmit)}
									>
										{isBusy ? (
											<>
												<Loader2 className="size-4 animate-spin" />
												Working...
											</>
										) : (
											<>
												Upload &amp; create session
												<ArrowRight className="size-4" />
											</>
										)}
									</Button>
								</div>
							</CardFooter>
						</Card>
					</motion.section>
				)}
			</AnimatePresence>
		</div>
	)
}
