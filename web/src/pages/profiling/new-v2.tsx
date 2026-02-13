import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { useNavigate, Link } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { useState, useEffect, useCallback, useRef } from "react"
import {
	ArrowRight,
	CheckCircle2,
	FileText,
	Layers,
	Loader2,
	RefreshCw,
	UploadCloud,
	X,
	Ban,
} from "lucide-react"

import { api } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatFileSize } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	MAX_FILES_PER_SESSION,
	MAX_FILE_BYTES,
	ALLOWED_MIME_TYPES_LIST,
	FILE_INPUT_ACCEPT,
} from "@/lib/constants"
import {
	useUploadFiles,
	useUploadPhase,
	useUploadActions,
	type FileStatus,
} from "@/stores/upload-store"
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
			return "Getting ready..."
		case "ready":
			return "Ready"
		case "uploading":
			return "Uploading..."
		case "done":
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
		case "ready":
			return <CheckCircle2 className="size-4 text-sky-500" />
		case "uploading":
			return <Loader2 className="size-4 animate-spin text-sky-500" />
		case "done":
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
	const {
		addFiles,
		removeFile,
		clearAll,
		updateFileById,
		setPhase,
		setSessionId,
		checkAndHash
	} = useUploadActions()

	const [isDragging, setIsDragging] = useState(false)
	const abortRef = useRef<AbortController | null>(null)
	const xhrRefs = useRef<XMLHttpRequest[]>([])

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
		checkAndHash()
	}, [files])

	const readyFiles = files.filter(f => f.status === "ready" || f.status === "done" || f.status === "reused")
	const failedFiles = files.filter(f => f.status === "failed")
	const allFilesReady = files.length > 0 && files.every(f => f.status === "ready")
	const isBusy = phase !== "idle" && phase !== "done" && phase !== "error"

	const handleAddFiles = useCallback(
		(newFiles: File[]) => {
			if (isBusy) return

			if (files.length + newFiles.length > MAX_FILES_PER_SESSION) {
				toast.error(`Maximum ${MAX_FILES_PER_SESSION} files allowed per batch`)
				return
			}

			const validFiles: File[] = []
			for (const file of newFiles) {
				if (!ALLOWED_MIME_TYPES_LIST.includes(file.type as typeof ALLOWED_MIME_TYPES_LIST[number])) {
					toast.error(`${file.name}: Only PDF, DOCX, and TXT allowed`)
					continue
				}
				if (file.size > MAX_FILE_BYTES) {
					toast.error(`${file.name}: File too large (max ${MAX_FILE_BYTES / 1024 / 1024}MB)`)
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
		[files, isBusy]
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

	const uploadViaPresignedUrl = (args: {
		uploadUrl: string
		file: File
		mimeType: string
		signal: AbortSignal
	}) => {
		const { uploadUrl, file, mimeType, signal } = args

		return new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest()
			xhrRefs.current.push(xhr)

			const abortListener = xhr.abort
			signal.addEventListener("abort", abortListener)

			xhr.open("PUT", uploadUrl)
			xhr.setRequestHeader("Content-Type", mimeType)

			xhr.onload = () => {
				signal.removeEventListener("abort", abortListener)
				xhrRefs.current = xhrRefs.current.filter(item => item !== xhr)
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve()
					return
				}
				reject(new Error(`Upload failed with status ${xhr.status}`))
			}

			xhr.onerror = () => {
				signal.removeEventListener("abort", abortListener)
				xhrRefs.current = xhrRefs.current.filter(item => item !== xhr)
				reject(new Error("Network error while uploading file"))
			}

			xhr.onabort = () => {
				signal.removeEventListener("abort", abortListener)
				xhrRefs.current = xhrRefs.current.filter(item => item !== xhr)
				reject(new DOMException("Upload aborted", "AbortError"))
			}

			xhr.send(file)
		})
	}

	const handleCancel = () => {
		abortRef.current?.abort()
		xhrRefs.current.forEach((xhr) => xhr.abort())
		xhrRefs.current = []
		abortRef.current = null
		clearAll()
		toast.info("Upload cancelled")
	}

	const onSubmit = async (formData: SessionFormData) => {
		if (!allFilesReady || files.length === 0) {
			toast.error("Please add files and wait for them to be ready")
			return
		}

		const filesToProcess = files.filter(f => f.status === "ready" && f.fingerprint)
		if (filesToProcess.length === 0) {
			toast.error("No files ready for upload")
			return
		}

		try {
			setPhase("uploading")

			const controller = new AbortController()
			abortRef.current = controller

			// const x = await api.api.
			// Step 1: Get presigned URLs
			const { data: presignData, error: presignError } = await api.api.v2.sessions.presign.post({
				files: filesToProcess.map(f => ({
					clientId: f.id,
					fileName: f.originalName,
					mimeType: f.mimeType,
					size: f.size,
				})),
			}, {
				fetch: { signal: controller.signal },
			})

			if (presignError || !presignData || presignData.status !== "ok") {
				throw new Error("Could not get presigned upload URLs")
			}

			// Step 2: Upload each file to its presigned URL
			for (const file of filesToProcess) {
				const uploadTarget = presignData.uploads.find(u => u.clientId === file.id)
				if (!uploadTarget) {
					throw new Error(`Missing upload target for ${file.originalName}`)
				}

				updateFileById(file.id, { status: "uploading", errorMessage: undefined })

				try {
					await uploadViaPresignedUrl({
						uploadUrl: uploadTarget.uploadUrl,
						file: file.file,
						mimeType: file.mimeType,
						signal: controller.signal,
					})
					updateFileById(file.id, { status: "done" })
				}
				catch (uploadError) {
					updateFileById(file.id, {
						status: "failed",
						errorMessage: uploadError instanceof Error ? uploadError.message : "Upload failed",
					})
					throw uploadError
				}
			}

			// Step 3: Create session with storage keys
			const { data: createData, error: createError } = await api.api.v2.sessions.create.post({
				name: formData.sessionName.trim(),
				jobDescription: formData.jobDescription.trim(),
				jobTitle: formData.jobTitle.trim() || undefined,
				files: presignData.uploads.map(u => {
					const source = filesToProcess.find(f => f.id === u.clientId)!
					return {
						storageKey: u.storageKey,
						fileName: source.originalName,
						mimeType: source.mimeType,
						size: source.size,
					}
				}),
			}, {
				fetch: { signal: controller.signal },
			})

			if (createError || !createData || createData.status !== "ready") {
				throw new Error("Session creation failed")
			}

			setPhase("done")
			toast.success("Session created successfully!")
			setTimeout(() => {
				clearAll()
				navigate(`/profiling/${createData.sessionId}`)
			}, 1200)

			abortRef.current = null
		}
		catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") {
				return
			}

			setPhase("error")
			toast.error(err instanceof Error ? err.message : "Something went wrong")
			console.error(err)
		}
		finally {
			xhrRefs.current = []
			abortRef.current = null
		}
	}

	const canCreate = allFilesReady && files.length > 0 && !isBusy

	const phaseLabel = {
		idle: "",
		hashing: "Preparing files...",
		uploading: "Uploading files...",
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
									maxLength: { value: 2048, message: "Max 2048 characters" },
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
								accept={FILE_INPUT_ACCEPT}
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
									PDF, DOCX, TXT up to {MAX_FILE_BYTES / 1024 / 1024}MB each
								</p>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
								<span className="inline-flex items-center gap-1">
									<Layers className="size-3" /> Batch up to {MAX_FILES_PER_SESSION} files
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
											<div className="mt-3">
												<div className="flex justify-between text-[10px] text-muted-foreground">
													<span>{fileStatusLabel(file.status, file.errorMessage)}</span>
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
									{isBusy && (
										<Button
											variant="destructive"
											className="flex-1 sm:flex-none gap-2"
											onClick={handleCancel}
										>
											<Ban className="size-4" />
											Cancel
										</Button>
									)}
									{phase === "error" && (
										<Button
											variant="secondary"
											className="flex-1 sm:flex-none gap-2"
											onClick={() => {
												setPhase("idle")
												setSessionId(null)
											}}
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
