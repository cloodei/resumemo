import { toast } from "sonner"
import { motion } from "motion/react"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, Loader2, X } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { api } from "@/lib/api"
import {
	ALLOWED_MIME_TYPES_LIST,
	FILE_INPUT_ACCEPT,
	MAX_FILE_BYTES,
	MAX_FILES_PER_SESSION,
} from "@/lib/constants"
import { getEdenErrorMessage, getErrorMessage } from "@/lib/errors"
import { formatFileSize } from "@/lib/utils"
import {
	NewSessionFileQueue,
	NewSessionHero,
	NewSessionRoleForm,
	NewSessionUploadPanel,
	newSessionSteps,
} from "@/components/features/profiling"
import {
	type FileStatus,
	type SessionFormData,
	useUploadActions,
	useUploadStore,
	useUploadFiles,
	useUploadFormData,
	useUploadPhase,
} from "@/stores/upload-store"

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

export default function NewProfilingPage() {
	const navigate = useNavigate()
	const files = useUploadFiles()
	const phase = useUploadPhase()
	const storedFormData = useUploadFormData()
	const createErrorMessage = useUploadStore(state => state.createErrorMessage)
	const createErrorDetails = useUploadStore(state => state.createErrorDetails)
	const {
		addFiles,
		removeFile,
		clearAll,
		clearFiles,
		updateFileById,
		setPhase,
		setFormData,
		setCreateError,
	} = useUploadActions()

	const [isDragging, setIsDragging] = useState(false)
	const abortRef = useRef<AbortController | null>(null)
	const xhrRefs = useRef<XMLHttpRequest[]>([])

	const {
		register,
		handleSubmit,
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
	}, [watchedFields.jobTitle, watchedFields.jobDescription, watchedFields.sessionName])

	const failedFiles = useMemo(() => files.filter(file => file.status === "failed"), [files])
	const doneFiles = useMemo(() => files.filter(file => file.status === "done"), [files])
	const pendingUploadFiles = useMemo(() => files.filter(file => file.status === "ready" || file.status === "failed"), [files])
	const isBusy = phase === "uploading" || phase === "creating"
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
	}, [files, isBusy])

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
		setCreateError(undefined)
		setPhase(doneFiles.length > 0 ? "create_error" : "idle")
		toast.info("Stopped the current attempt. You can try again when you're ready.")
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

		if (error || !data || data.status !== "processing") {
			const errorValue = error?.value && typeof error.value === "object"
				? error.value as Record<string, unknown>
				: null
			const message = errorValue && typeof errorValue.message === "string"
				? errorValue.message
				: undefined
			const details = errorValue && typeof errorValue.details === "string"
				? errorValue.details
				: undefined
			const targetSessionId = errorValue && typeof errorValue.targetSessionId === "string"
				? errorValue.targetSessionId
				: undefined

			const creationError = new Error(getEdenErrorMessage(error) || message || "Session creation failed") as Error & {
				messageForUi?: string
				detailsForUi?: string
				targetSessionIdForUi?: string
			}
			creationError.messageForUi = message
			creationError.detailsForUi = details
			creationError.targetSessionIdForUi = targetSessionId

			throw creationError
		}

		setPhase("done")
		setCreateError(undefined)
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
			setCreateError(undefined)
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

			const typedError = error as Error & { messageForUi?: string; detailsForUi?: string }
			const targetSessionId = (error as Error & { targetSessionIdForUi?: string }).targetSessionIdForUi
			const fallbackMessage = stage === "creating"
				? "We couldn't start processing"
				: "Could not finish uploading files"
			const errorText = getErrorMessage(error, fallbackMessage)

			if (stage === "creating") {
				if (targetSessionId) {
					clearAll()
					toast.error(typedError.messageForUi ?? "We couldn't start processing.")
					navigate(`/profiling/${targetSessionId}`)
					return
				}

				setCreateError({
					message: typedError.messageForUi ?? "We couldn't start processing.",
					details: typedError.detailsForUi ?? "Please try again.",
				})
			}

			setPhase(stage === "creating" ? "create_error" : "upload_error")
			toast.error(errorText)
			console.error("[NewSession] Submit error:", error)
		}
		finally {
			xhrRefs.current = []
			abortRef.current = null
		}
	}

	return (
		<div className="flex flex-col gap-8">
			<NewSessionHero steps={newSessionSteps} />

			<motion.section
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.2, duration: 0.5 }}
				className="grid gap-6 lg:grid-cols-2"
			>
				<NewSessionRoleForm
					isBusy={isBusy}
					errors={errors}
					register={register as never}
				/>

				<NewSessionUploadPanel
					isBusy={isBusy}
					isDragging={isDragging}
					filesCount={files.length}
					doneFilesCount={doneFiles.length}
					failedFilesCount={failedFiles.length}
					phase={phase}
					createErrorMessage={createErrorMessage}
					createErrorDetails={createErrorDetails}
					maxFileMb={MAX_FILE_BYTES / 1024 / 1024}
					maxFiles={MAX_FILES_PER_SESSION}
					accept={FILE_INPUT_ACCEPT}
					onDragOver={(event) => {
						event.preventDefault()
						setIsDragging(true)
					}}
					onDragLeave={(event) => {
						event.preventDefault()
						setIsDragging(false)
					}}
					onDrop={handleDrop}
					onBrowse={() => document.getElementById("file-input")?.click()}
					onFileChange={handleFileSelect}
				/>
			</motion.section>

			<NewSessionFileQueue
				files={files}
				phase={phase}
				createErrorMessage={createErrorMessage}
				createErrorDetails={createErrorDetails}
				pendingUploadCount={pendingUploadFiles.length}
				doneFilesCount={doneFiles.length}
				isBusy={isBusy}
				canSubmit={canSubmit}
				formatFileSize={formatFileSize}
				onRemoveFile={removeFile}
				onClearFiles={clearFiles}
				onCancel={handleCancel}
				onRetry={handleSubmit(onSubmit)}
				onStartOver={() => {
					clearAll()
					setPhase("idle")
				}}
				onRemoveFailedFiles={() => failedFiles.forEach(file => removeFile(file.id))}
				fileStatusIcon={fileStatusIcon}
			/>
		</div>
	)
}
