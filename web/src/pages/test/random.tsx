import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { useState, useCallback, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "motion/react"
import {
	ArrowRight,
	CheckCircle2,
	FileText,
	Loader2,
	UploadCloud,
	X,
	Beaker,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatFileSize } from "@/lib/utils"
import {
	MAX_FILES_PER_SESSION,
	MAX_FILE_BYTES,
	ALLOWED_MIME_TYPES_LIST,
	FILE_INPUT_ACCEPT,
	BASE_URL,
} from "@/lib/constants"
import {
	useUploadFiles,
	useUploadPhase,
	useUploadActions,
	type FileStatus,
} from "@/stores/upload-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"

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
		title: "Test submit",
		description: "Submit to /random/test endpoint for testing.",
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
			return "Sent"
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

type TestFormData = {
	sessionName: string
	jobTitle: string
	jobDescription: string
}

export default function RandomTestPage() {
	const files = useUploadFiles()
	const phase = useUploadPhase()
	const {
		addFiles,
		removeFile,
		clearAll,
		updateFileByName,
		setPhase,
		checkAndHash
	} = useUploadActions()

	const [isDragging, setIsDragging] = useState(false)
	const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null)
	const abortRef = useRef<AbortController | null>(null)

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = useForm<TestFormData>({
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
		[files, isBusy, addFiles]
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

	const handleCancel = () => {
		abortRef.current?.abort()
		abortRef.current = null
		clearAll()
		setTestResult(null)
		toast.info("Test cancelled")
	}

	const onSubmit = async (data: TestFormData) => {
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
			setTestResult(null)

			// Mark files as uploading
			for (const f of filesToProcess) {
				updateFileByName(f.originalName, { status: "uploading" })
			}

			// Build the hash manifest
			const hashManifest = filesToProcess.map(f => ({
				name: f.originalName,
				size: f.size,
				mimeType: f.mimeType,
				xxh64: f.fingerprint!,
			}))

			const { data: result } = await api[67].random.test.post({
				name: data.sessionName.trim(),
				jobDescription: data.jobDescription.trim(),
				jobTitle: data.jobTitle.trim() || "Untitled Position",
				hashes: JSON.stringify(hashManifest),
				files: filesToProcess.map(f => f.file),
			})

			// // Build FormData
			// const formData = new FormData()
			// formData.append("name", data.sessionName.trim())
			// formData.append("jobDescription", data.jobDescription.trim())
			// formData.append("jobTitle", data.jobTitle.trim() || "Untitled Position")
			// formData.append("hashes", JSON.stringify(hashManifest))
			// for (const f of filesToProcess) {
			// 	formData.append("files", f.file, f.originalName)
			// }

			// const controller = new AbortController()
			// abortRef.current = controller

			// const response = await fetch(`${BASE_URL}/67/random/test`, {
			// 	method: "POST",
			// 	body: formData,
			// 	credentials: "include",
			// 	signal: controller.signal,
			// })

			// if (!response.ok) {
			// 	throw new Error(`Request failed with status ${response.status}`)
			// }

			// const result = await response.json()
			setTestResult(result)

			// Mark all files as done
			for (const f of filesToProcess) {
				updateFileByName(f.originalName, { status: "done" })
			}

			setPhase("done")
			toast.success("Test completed successfully!")

			abortRef.current = null
		} catch (err) {
			const message = err instanceof Error ? err.message : "Test failed"
			console.error("Test error:", err)

			// Mark files as failed
			for (const f of filesToProcess) {
				updateFileByName(f.originalName, { status: "failed", errorMessage: message })
			}

			setPhase("error")
			toast.error(message)
			abortRef.current = null
		}
	}

	const currentStep = phase === "uploading" || phase === "done" || phase === "error" ? 3 : files.length > 0 ? 2 : 1

	return (
		<div className="min-h-[calc(100vh-4rem)] bg-linear-to-b from-slate-50/50 to-white dark:from-slate-950 dark:to-slate-900">
			<div className="container max-w-5xl py-8 md:py-12">
				{/* Header */}
				<div className="mb-8 text-center">
					<div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 mb-4">
						<Beaker className="size-4" />
						<span>Test Interface</span>
					</div>
					<h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
						Random API Test
					</h1>
					<p className="mt-2 text-slate-600 dark:text-slate-400">
						Test the /67/random/test endpoint with form data and file uploads
					</p>
				</div>

				{/* Progress Steps */}
				<div className="mb-10">
					<div className="flex items-center justify-between">
						{steps.map((step, index) => (
							<div key={step.id} className="flex items-center">
								<div
									className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
										currentStep > step.id
											? "border-emerald-500 bg-emerald-500 text-white"
											: currentStep === step.id
												? "border-sky-500 bg-sky-500 text-white"
												: "border-slate-200 bg-white text-slate-400 dark:border-slate-700 dark:bg-slate-800"
									}`}
								>
									{currentStep > step.id ? (
										<CheckCircle2 className="size-5" />
									) : (
										step.id
									)}
								</div>
								<div className="ml-3 hidden sm:block">
									<p
										className={`text-sm font-medium ${
											currentStep >= step.id ? "text-slate-900 dark:text-slate-100" : "text-slate-500 dark:text-slate-400"
										}`}
									>
										{step.title}
									</p>
									<p className="text-xs text-slate-500 dark:text-slate-400">{step.description}</p>
								</div>
								{index < steps.length - 1 && (
									<div
										className={`mx-4 hidden h-0.5 w-16 sm:block ${
											currentStep > step.id ? "bg-emerald-500" : "bg-slate-200 dark:bg-slate-700"
										}`}
									/>
								)}
							</div>
						))}
					</div>
				</div>

				<div className="grid gap-8 lg:grid-cols-[1fr_380px]">
					{/* Main Form */}
					<div className="space-y-6">
						{/* Step 1: Role Description */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
										1
									</span>
									Role Details
								</CardTitle>
								<CardDescription>Enter the test session details</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<label className="text-sm font-medium">Session Name</label>
									<Input
										placeholder="e.g., Test Session Alpha"
										{...register("sessionName", { required: "Session name is required" })}
									/>
									{errors.sessionName && (
										<p className="text-xs text-destructive">{errors.sessionName.message}</p>
									)}
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium">Job Title (optional)</label>
									<Input
										placeholder="e.g., Senior Engineer"
										{...register("jobTitle")}
									/>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium">Job Description</label>
									<Textarea
										placeholder="Paste the job description here..."
										className="min-h-[120px] resize-none"
										{...register("jobDescription", { required: "Job description is required" })}
									/>
									{errors.jobDescription && (
										<p className="text-xs text-destructive">{errors.jobDescription.message}</p>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Step 2: File Upload */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
										2
									</span>
									Upload Resumes
								</CardTitle>
								<CardDescription>Drag and drop or click to select files</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div
									onDragOver={(e) => {
										e.preventDefault()
										setIsDragging(true)
									}}
									onDragLeave={() => setIsDragging(false)}
									onDrop={handleDrop}
									className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 transition-colors ${
										isDragging
											? "border-sky-500 bg-sky-50 dark:bg-sky-900/10"
											: "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
									}`}
								>
									<input
										type="file"
										multiple
										accept={FILE_INPUT_ACCEPT}
										onChange={handleFileSelect}
										className="absolute inset-0 cursor-pointer opacity-0"
									/>
									<div className="flex flex-col items-center justify-center text-center">
										<div className="mb-3 rounded-full bg-slate-100 p-3 dark:bg-slate-800">
											<UploadCloud className="size-6 text-slate-400" />
										</div>
										<p className="text-sm font-medium text-slate-700 dark:text-slate-300">
											Drop files here or click to browse
										</p>
										<p className="mt-1 text-xs text-slate-500">
											PDF, DOCX, or TXT up to {MAX_FILE_BYTES / 1024 / 1024}MB each
										</p>
									</div>
								</div>

								{/* File List */}
								<AnimatePresence>
									{files.length > 0 && (
										<motion.div
											initial={{ opacity: 0, height: 0 }}
											animate={{ opacity: 1, height: "auto" }}
											exit={{ opacity: 0, height: 0 }}
											className="space-y-2"
										>
											<div className="flex items-center justify-between">
												<p className="text-sm font-medium text-slate-700 dark:text-slate-300">
													{files.length} file{files.length !== 1 ? "s" : ""} selected
												</p>
												<Button
													variant="ghost"
													size="sm"
													onClick={clearAll}
													disabled={isBusy}
												>
													Clear all
												</Button>
											</div>
											<div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-2">
												{files.map((file) => (
													<div
														key={file.id}
														className="flex items-center justify-between rounded-md bg-slate-50 p-2 dark:bg-slate-800/50"
													>
														<div className="flex items-center gap-3 min-w-0">
															{fileStatusIcon(file.status)}
															<div className="min-w-0 flex-1">
																<p className="truncate text-sm font-medium">{file.originalName}</p>
																<p className="text-xs text-slate-500">
																	{formatFileSize(file.size)} · {fileStatusLabel(file.status, file.errorMessage)}
																</p>
															</div>
														</div>
														<Button
															variant="ghost"
															size="icon"
															className="h-8 w-8 shrink-0"
															onClick={() => removeFile(file.id)}
															disabled={isBusy}
														>
															<X className="size-4" />
														</Button>
													</div>
												))}
											</div>
										</motion.div>
									)}
								</AnimatePresence>
							</CardContent>
						</Card>

						{/* Step 3: Submit */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
										3
									</span>
									Test Submission
								</CardTitle>
								<CardDescription>Submit to the /67/random/test endpoint</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="flex flex-col gap-4 sm:flex-row">
									<Button
										onClick={handleSubmit(onSubmit)}
										disabled={!allFilesReady || files.length === 0 || isBusy}
										size="lg"
										className="flex-1"
									>
										{isBusy ? (
											<>
												<Loader2 className="mr-2 size-4 animate-spin" />
												Sending...
											</>
										) : (
											<>
												Submit Test
												<ArrowRight className="ml-2 size-4" />
											</>
										)}
									</Button>
									{isBusy && (
										<Button variant="outline" size="lg" onClick={handleCancel}>
											Cancel
										</Button>
									)}
								</div>
							</CardContent>
						</Card>

						{/* Test Result */}
						{testResult && (
							<Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/30 dark:bg-emerald-950/10">
								<CardHeader>
									<CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
										<CheckCircle2 className="size-5" />
										Test Response
									</CardTitle>
								</CardHeader>
								<CardContent>
									<pre className="max-h-64 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
										{JSON.stringify(testResult, null, 2)}
									</pre>
								</CardContent>
							</Card>
						)}
					</div>

					{/* Sidebar Summary */}
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Summary</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-center justify-between">
									<span className="text-sm text-slate-600 dark:text-slate-400">Files selected</span>
									<Badge variant="secondary">{files.length}</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-slate-600 dark:text-slate-400">Ready to upload</span>
									<Badge variant={readyFiles.length > 0 ? "default" : "secondary"}>
										{readyFiles.length}
									</Badge>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm text-slate-600 dark:text-slate-400">Total size</span>
									<span className="text-sm font-medium">
										{formatFileSize(files.reduce((acc, f) => acc + f.size, 0))}
									</span>
								</div>
							</CardContent>
						</Card>

						<Card className="bg-amber-50/50 dark:bg-amber-950/10">
							<CardHeader>
								<CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
									<Beaker className="size-4" />
									Test Only
								</CardTitle>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-amber-700/80 dark:text-amber-400/80">
									This interface submits to <code className="rounded bg-amber-100 px-1 py-0.5 text-xs dark:bg-amber-900/30">/67/random/test</code> for testing purposes only. 
									No actual profiling session is created.
								</p>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	)
}
