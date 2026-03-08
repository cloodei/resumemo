import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { motion, AnimatePresence } from "motion/react"
import {
	ArrowRight,
	Ban,
	CheckCircle2,
	FileText,
	Layers,
	Loader2,
	RefreshCw,
	RotateCcw,
	UploadCloud,
	X,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { api } from "@/lib/api"
import {
	ALLOWED_MIME_TYPES_LIST,
	FILE_INPUT_ACCEPT,
	MAX_FILE_BYTES,
	MAX_FILES_PER_SESSION,
} from "@/lib/constants"
import { getEdenErrorMessage, getErrorMessage } from "@/lib/errors"
import { formatFileSize } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import {
	type FileStatus,
	type SessionFormData,
	useUploadActions,
	useUploadFiles,
	useUploadFormData,
	useUploadPhase,
} from "@/stores/upload-store"

const steps = [
	{
		id: 1,
		title: "Describe the role",
		description: "Add the session name, title, and hiring context.",
	},
	{
		id: 2,
		title: "Add resumes",
		description: "Drag in PDF, DOCX, or TXT files once.",
	},
	{
		id: 3,
		title: "Launch profiling",
		description: "If something fails, you can retry instead of starting over.",
	},
] as const

const jdTemplates = [
	{
		title: "Senior Frontend Engineer",
		summary: "React, TypeScript, accessibility, testing, and design systems.",
	},
	{
		title: "AI Research Scientist",
		summary: "Model evaluation, experimentation, deployment readiness, and cross-functional communication.",
	},
] as const

function fileStatusLabel(status: FileStatus, errorMessage?: string) {
	switch (status) {
		case "ready":
			return "Ready to upload"
		case "uploading":
			return "Uploading"
		case "done":
			return "Uploaded and reusable"
		case "failed":
			return errorMessage ?? "Upload failed"
	}
}

function fileStatusIcon(status: FileStatus) {
	switch (status) {
		case "ready":
			return <CheckCircle2 className="size-4 text-sky-500" />
		case "uploading":
			return <Loader2 className="size-4 animate-spin text-sky-500" />
		case "done":
			return <CheckCircle2 className="size-4 text-emerald-500" />
		case "failed":
			return <X className="size-4 text-destructive" />
	}
}

const phaseLabel = {
	idle: "",
	uploading: "Uploading resumes...",
	creating: "Creating the profiling session...",
	upload_error: "Some uploads failed. Retry only the failed files.",
	create_error: "Your files are safe. Retry session creation without uploading again.",
	done: "Session created. Redirecting...",
} as const

export default function NewProfilingPage() {
	const navigate = useNavigate()
	const files = useUploadFiles()
	const phase = useUploadPhase()
	const storedFormData = useUploadFormData()
	const {
		addFiles,
		removeFile,
		clearAll,
		clearFiles,
		updateFileById,
		setPhase,
		setFormData,
	} = useUploadActions()

	const [isDragging, setIsDragging] = useState(false)
	const abortRef = useRef<AbortController | null>(null)
	const xhrRefs = useRef<XMLHttpRequest[]>([])

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<SessionFormData>({
		defaultValues: {
			sessionName: storedFormData.sessionName,
			jobTitle: storedFormData.jobTitle,
			jobDescription: storedFormData.jobDescription,
		},
	})

	const watchedFields = watch()
	useEffect(() => {
		setFormData(watchedFields)
	}, [setFormData, watchedFields])

	const failedFiles = useMemo(() => files.filter(file => file.status === "failed"), [files])
	const doneFiles = useMemo(() => files.filter(file => file.status === "done"), [files])
	const pendingUploadFiles = useMemo(() => files.filter(file => file.status === "ready" || file.status === "failed"), [files])
	const isBusy = phase === "uploading" || phase === "creating"
	const canImportFromLibrary = false
	const canSubmit = files.length > 0 && !isBusy

	const handleAddFiles = useCallback((newFiles: File[]) => {
		if (isBusy)
			return

		if (files.length + newFiles.length > MAX_FILES_PER_SESSION) {
			toast.error(`Maximum ${MAX_FILES_PER_SESSION} files allowed per session`)
			return
		}

		const validFiles: File[] = []
		for (const file of newFiles) {
			if (!ALLOWED_MIME_TYPES_LIST.includes(file.type as typeof ALLOWED_MIME_TYPES_LIST[number])) {
				toast.error(`${file.name}: only PDF, DOCX, and TXT are supported`)
				continue
			}

			if (file.size > MAX_FILE_BYTES) {
				toast.error(`${file.name}: file is too large`)
				continue
			}

			if (files.some(existing => existing.originalName === file.name && existing.size === file.size)) {
				toast.error(`${file.name}: already added`)
				continue
			}

			validFiles.push(file)
		}

		if (validFiles.length > 0)
			addFiles(validFiles)
	}, [addFiles, files, isBusy])

	const handleDrop = (event: React.DragEvent) => {
		event.preventDefault()
		setIsDragging(false)
		handleAddFiles(Array.from(event.dataTransfer.files))
	}

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFiles = event.target.files ? Array.from(event.target.files) : []
		handleAddFiles(selectedFiles)
		event.target.value = ""
	}

	const uploadViaPresignedUrl = (args: {
		uploadUrl: string
		file: File
		mimeType: string
		signal: AbortSignal
		onProgress: (percent: number) => void
	}) => {
		const { uploadUrl, file, mimeType, signal, onProgress } = args
		const xhr = new XMLHttpRequest()
		xhrRefs.current.push(xhr)

		const onAbort = () => xhr.abort()
		signal.addEventListener("abort", onAbort)

		const cleanup = () => {
			signal.removeEventListener("abort", onAbort)
			xhrRefs.current = xhrRefs.current.filter(item => item !== xhr)
		}

		return new Promise<void>((resolve, reject) => {
			xhr.open("PUT", uploadUrl)
			xhr.setRequestHeader("Content-Type", mimeType)

			xhr.upload.onprogress = (event) => {
				if (event.lengthComputable)
					onProgress(Math.round((event.loaded / event.total) * 100))
			}

			xhr.onload = () => {
				cleanup()
				if (xhr.status >= 200 && xhr.status < 300) {
					resolve()
					return
				}

				reject(new Error(`Upload failed with status ${xhr.status}`))
			}

			xhr.onerror = () => {
				cleanup()
				reject(new Error("Network error while uploading file"))
			}

			xhr.onabort = () => {
				cleanup()
				reject(new DOMException("Upload aborted", "AbortError"))
			}

			xhr.send(file)
		})
	}

	const resetUploadingFilesToReady = () => {
		for (const file of files) {
			if (file.status === "uploading") {
				updateFileById(file.id, {
					status: file.storageKey ? "done" : "ready",
					progress: file.storageKey ? 100 : 0,
					errorMessage: undefined,
				})
			}
		}
	}

	const handleCancel = () => {
		abortRef.current?.abort()
		xhrRefs.current.forEach(xhr => xhr.abort())
		xhrRefs.current = []
		abortRef.current = null
		resetUploadingFilesToReady()
		setPhase(doneFiles.length > 0 ? "create_error" : "idle")
		toast.info("Stopped the current attempt. Your uploaded files are still available.")
	}

	const startSessionCreation = async (formData: SessionFormData, filesToCreate: Array<{
		storageKey: string
		fileName: string
		mimeType: string
		size: number
	}>, signal: AbortSignal) => {
		setPhase("creating")

		const { data, error } = await api.api.v2.sessions.create.post({
			name: formData.sessionName.trim(),
			jobDescription: formData.jobDescription.trim(),
			jobTitle: formData.jobTitle.trim() || undefined,
			files: filesToCreate,
		}, {
			fetch: { signal },
		})

		if (signal.aborted)
			return

		if (error || !data || data.status !== "processing")
			throw new Error(getEdenErrorMessage(error) ?? "Session creation failed")

		setPhase("done")
		toast.success("Session created. Profiling has started.")
		setTimeout(() => {
			clearAll()
			navigate(`/profiling/${data.sessionId}`)
		}, 900)
	}

	const onSubmit = async (formData: SessionFormData) => {
		if (files.length === 0) {
			toast.error("Add at least one resume to continue")
			return
		}

		const controller = new AbortController()
		abortRef.current = controller
		let stage: "uploading" | "creating" = pendingUploadFiles.length > 0 ? "uploading" : "creating"

		try {
			const uploadedById = new Map<number, { storageKey: string }>()
			for (const file of doneFiles) {
				if (file.storageKey)
					uploadedById.set(file.id, { storageKey: file.storageKey })
			}

			if (pendingUploadFiles.length > 0) {
				setPhase("uploading")

				const { data: presignData, error: presignError } = await api.api.v2.sessions.presign.post({
					files: pendingUploadFiles.map(file => ({
						clientId: file.id,
						fileName: file.originalName,
						mimeType: file.mimeType,
						size: file.size,
					})),
				}, {
					fetch: { signal: controller.signal },
				})

				if (controller.signal.aborted)
					return

				if (presignError || !presignData || presignData.status !== "ok")
					throw new Error(getEdenErrorMessage(presignError) ?? "Could not get upload URLs")

				const uploadResults = await Promise.allSettled(
					pendingUploadFiles.map(async (file) => {
						const uploadTarget = presignData.uploads.find(upload => upload.clientId === file.id)
						if (!uploadTarget)
							throw new Error(`Missing upload target for ${file.originalName}`)

						updateFileById(file.id, {
							status: "uploading",
							progress: 0,
							errorMessage: undefined,
						})

						await uploadViaPresignedUrl({
							uploadUrl: uploadTarget.uploadUrl,
							file: file.file,
							mimeType: file.mimeType,
							signal: controller.signal,
							onProgress: percent => updateFileById(file.id, { progress: percent }),
						})

						uploadedById.set(file.id, { storageKey: uploadTarget.storageKey })
						updateFileById(file.id, {
							status: "done",
							storageKey: uploadTarget.storageKey,
							progress: 100,
							errorMessage: undefined,
						})
					})
				)

				const failedUploadCount = uploadResults.filter(result => result.status === "rejected").length
				if (failedUploadCount > 0) {
					pendingUploadFiles.forEach((file, index) => {
						const result = uploadResults[index]
						if (result.status === "rejected") {
							updateFileById(file.id, {
								status: "failed",
								progress: 0,
								errorMessage: getErrorMessage(result.reason, "Upload failed"),
							})
						}
					})

					setPhase("upload_error")
					toast.error(`${failedUploadCount} file${failedUploadCount === 1 ? "" : "s"} still need attention`)
					return
				}
			}

			stage = "creating"
			const filesToCreate = files.map((file) => {
				const uploaded = uploadedById.get(file.id)
				if (!uploaded?.storageKey)
					throw new Error(`Missing uploaded file for ${file.originalName}`)

				return {
					storageKey: uploaded.storageKey,
					fileName: file.originalName,
					mimeType: file.mimeType,
					size: file.size,
				}
			})

			await startSessionCreation(formData, filesToCreate, controller.signal)
		}
		catch (error) {
			if (error instanceof DOMException && error.name === "AbortError")
				return

			setPhase(stage === "creating" ? "create_error" : "upload_error")
			toast.error(getErrorMessage(error, stage === "creating"
				? "Could not create the session"
				: "Could not finish uploading files"))
			console.error("[NewSession] Submit error:", error)
		}
		finally {
			xhrRefs.current = []
			abortRef.current = null
		}
	}

	return (
		<div className="flex flex-col gap-8">
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
						If something fails mid-flow, you can retry from the same screen without reselecting every resume.
					</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-3">
					{steps.map((step) => (
						<Card
							key={step.id}
							className="group relative overflow-hidden border-dashed shadow-m transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-l dark:hover:border-transparent"
						>
							<CardHeader className="gap-2">
								<CardTitle className="flex items-center gap-2 text-base font-semibold">
									<span className="flex size-7 items-center justify-center rounded-full bg-muted font-medium shadow-m transition-colors group-hover:bg-primary/10 group-hover:text-primary">
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

			<motion.section
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2, duration: 0.5 }}
				className="grid gap-6 lg:grid-cols-2"
			>
				<Card className="border-none shadow-x">
					<CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 pb-4 dark:border-border/30">
						<div>
							<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
								Role brief
							</CardTitle>
							<CardDescription className="mt-1 text-sm">
								Describe what a strong candidate should look like.
							</CardDescription>
						</div>
						<Button variant="outline" size="sm" disabled={!canImportFromLibrary}>
							Import from library
						</Button>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid gap-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-foreground" htmlFor="session-name">
									Session name
								</label>
								{errors.sessionName && <span className="text-xs text-destructive">{errors.sessionName.message}</span>}
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
							<label className="text-sm font-medium text-foreground" htmlFor="job-description">
								Job description
							</label>
							<Textarea
								id="job-description"
								placeholder="Describe responsibilities, must-haves, preferred strengths, and hiring context..."
								className="min-h-[180px] resize-none"
								disabled={isBusy}
								{...register("jobDescription", {
									required: "Job description is required",
									maxLength: { value: 5000, message: "Max 5000 characters" },
								})}
							/>
							{errors.jobDescription && <span className="text-xs text-destructive">{errors.jobDescription.message}</span>}
						</div>

						<Tabs defaultValue="templates" className="pt-2">
							<TabsList>
								<TabsTrigger className="cursor-pointer border-none" value="templates">Templates</TabsTrigger>
								<TabsTrigger className="cursor-pointer border-none" value="history">Deprecated</TabsTrigger>
							</TabsList>
							<TabsContent value="templates" className="mt-4 grid gap-3 md:grid-cols-2">
								{jdTemplates.map((template) => (
									<div
										key={template.title}
										className="cursor-pointer rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-l dark:bg-muted/20"
										onClick={() => {
											setValue("jobTitle", template.title)
											setValue("jobDescription", `${template.summary}\n\nAdd more details about the role...`)
										}}
									>
										<p className="font-semibold text-foreground">{template.title}</p>
										<p className="mt-2 text-xs leading-5 text-muted-foreground">{template.summary}</p>
										<Button size="sm" variant="ghost" className="mt-4 h-9 px-3">Use template</Button>
									</div>
								))}
							</TabsContent>
							<TabsContent value="history" className="mt-4 text-sm text-muted-foreground">
								Session history duplication is paused while the retryable flow stabilizes.
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>

				<Card className="border-dashed shadow-x">
					<CardHeader className="border-b border-border/30 pb-4">
						<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
							Resume upload
						</CardTitle>
						<CardDescription className="mt-1 text-sm">
							Uploaded files stay reusable if session creation fails.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<motion.div
							onDragOver={(event) => {
								event.preventDefault()
								setIsDragging(true)
							}}
							onDragLeave={(event) => {
								event.preventDefault()
								setIsDragging(false)
							}}
							onDrop={handleDrop}
							whileHover={isBusy ? {} : { scale: 1.01 }}
							whileTap={isBusy ? {} : { scale: 0.995 }}
							className={`relative flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center transition-colors duration-200 ${isBusy ? "pointer-events-none opacity-60" : "cursor-pointer"} ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/40 hover:border-primary/50 hover:bg-muted/50"}`}
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
								<p className="text-sm font-medium text-foreground">Drag and drop resumes or click to browse</p>
								<p className="text-xs text-muted-foreground">PDF, DOCX, TXT up to {MAX_FILE_BYTES / 1024 / 1024}MB each</p>
							</div>
							<div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
								<span className="inline-flex items-center gap-1"><Layers className="size-3" /> Up to {MAX_FILES_PER_SESSION} files</span>
								<span className="inline-flex items-center gap-1"><FileText className="size-3" /> Duplicate name and size check</span>
							</div>
							<Button
								size="sm"
								className="mt-2"
								disabled={isBusy}
								onClick={(event) => {
									event.stopPropagation()
									document.getElementById("file-input")?.click()
								}}
							>
								Browse files
							</Button>
						</motion.div>

						{files.length > 0 && (
							<div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
								<p className="flex items-center gap-2 text-foreground">
									<CheckCircle2 className="size-4 text-emerald-500" />
									{files.length} file{files.length !== 1 ? "s" : ""} added
									{doneFiles.length > 0 && ` • ${doneFiles.length} already uploaded`}
								</p>
								{failedFiles.length > 0 && (
									<p className="mt-1 text-xs text-destructive">
										{failedFiles.length} file{failedFiles.length !== 1 ? "s" : ""} failed. Retry only those files or remove them.
									</p>
								)}
								{phase === "create_error" && (
									<p className="mt-1 text-xs text-muted-foreground">
										Uploads are already complete. You can retry creation immediately.
									</p>
								)}
							</div>
						)}
					</CardContent>
					<CardFooter className="justify-between text-xs text-muted-foreground">
						<span>Need help? Check the upload guide in the docs.</span>
					</CardFooter>
				</Card>
			</motion.section>

			<AnimatePresence>
				{files.length > 0 && (
					<motion.section
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: 20 }}
						transition={{ duration: 0.3 }}
					>
						<Card className="border-none shadow-x">
							<CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 pb-4 dark:border-border/30">
								<div>
									<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">
										File queue
									</CardTitle>
									<CardDescription className="mt-1 text-sm">
										{files.length} file{files.length !== 1 ? "s" : ""} • {pendingUploadFiles.length} still need upload • {doneFiles.length} reusable
									</CardDescription>
								</div>
								<div className="flex items-center gap-2">
									{isBusy && <Badge variant="secondary" className="gap-1 text-xs"><Loader2 className="size-3 animate-spin" /> Working</Badge>}
									<Button variant="ghost" size="sm" onClick={clearFiles} disabled={isBusy}>Clear all</Button>
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
											className="rounded-lg bg-muted/30 p-4 shadow-m dark:bg-muted/20"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex min-w-0 items-center gap-3">
													<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
														<FileText className="size-5 text-primary" />
													</div>
													<div className="min-w-0">
														<p className="truncate text-sm font-medium text-foreground">{file.originalName}</p>
														<p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
													</div>
												</div>
												<div className="flex shrink-0 items-center gap-1">
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
													{file.status === "uploading" && <span>{file.progress}%</span>}
												</div>
												{file.status === "uploading" && (
													<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
														<motion.div
															className="h-full rounded-full bg-sky-500"
															initial={{ width: 0 }}
															animate={{ width: `${file.progress}%` }}
															transition={{ duration: 0.2, ease: "easeOut" }}
														/>
													</div>
												)}
												{file.status === "done" && (
													<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
														<div className="h-full w-full rounded-full bg-emerald-500" />
													</div>
												)}
											</div>
										</motion.div>
									))}
								</div>
							</CardContent>
							<CardFooter className="flex flex-col items-start justify-between gap-4 border-t bg-muted/20 py-4 sm:flex-row sm:items-center">
								<div className="flex items-center gap-3 text-sm text-muted-foreground">
									{isBusy ? <Loader2 className="size-4 animate-spin text-sky-500" /> : phase === "done" ? <CheckCircle2 className="size-4 text-emerald-500" /> : phase === "upload_error" || phase === "create_error" ? <X className="size-4 text-destructive" /> : null}
									<span>{phaseLabel[phase]}</span>
								</div>

								<div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
									{isBusy && (
										<Button variant="destructive" className="gap-2" onClick={handleCancel}>
											<Ban className="size-4" />
											Stop
										</Button>
									)}
									{phase === "upload_error" && (
										<>
											<Button variant="secondary" className="gap-2" onClick={handleSubmit(onSubmit)}>
												<RefreshCw className="size-4" />
												Retry failed uploads
											</Button>
											<Button variant="outline" className="gap-2" onClick={() => failedFiles.forEach(file => removeFile(file.id))}>
												<X className="size-4" />
												Remove failed files
											</Button>
										</>
									)}
									{phase === "create_error" && (
										<Button variant="secondary" className="gap-2" onClick={handleSubmit(onSubmit)}>
											<RefreshCw className="size-4" />
											Retry session creation
										</Button>
									)}
									{(phase === "upload_error" || phase === "create_error") && (
										<Button
											variant="ghost"
											className="gap-2"
											onClick={() => {
												clearAll()
												setPhase("idle")
											}}
										>
											<RotateCcw className="size-4" />
											Start over
										</Button>
									)}
									<Button className="gap-2" disabled={!canSubmit} onClick={handleSubmit(onSubmit)}>
										{isBusy ? (
											<>
												<Loader2 className="size-4 animate-spin" />
												Working...
											</>
										) : phase === "create_error" ? (
											<>
												Retry session creation
												<ArrowRight className="size-4" />
											</>
										) : phase === "upload_error" ? (
											<>
												Retry failed uploads
												<ArrowRight className="size-4" />
											</>
										) : (
											<>
												Upload and create session
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
