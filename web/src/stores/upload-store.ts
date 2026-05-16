import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
	MAX_FILES_PER_SESSION,
	MAX_FILE_BYTES,
	ALLOWED_MIME_TYPES_LIST,
} from "@/lib/constants"

let _counter = 0

/**
 * Client-side file status, purely for UI state.
 *
 * Lifecycle:
 *   ready -> uploading -> done | failed
 *
 * Files are immediately "ready" on add. There is no async fingerprinting step.
 */
export type FileStatus = "ready" | "uploading" | "done" | "failed"

export type UploadFile = {
	id: number
	file: File
	originalName: string
	size: number
	mimeType: string
	status: FileStatus
	storageKey?: string
	/** Upload progress 0-100. Only meaningful when status is "uploading". */
	progress: number
	errorMessage?: string
}

/**
 * Upload phase for the overall orchestration state.
 *
 * idle         -> user is adding files and filling the form
 * uploading    -> presign and PUT requests are in flight
 * creating     -> files uploaded, session creation POST in flight
 * upload_error -> at least one file upload failed
 * create_error -> uploads finished but session creation failed
 * done         -> session created, navigating away
 */
export type UploadPhase = "idle" | "uploading" | "creating" | "upload_error" | "create_error" | "done"

export type SessionFormData = {
	sessionName: string
	jobTitle: string
	jobDescription: string
	jobDescriptionTemplateId?: string
}

const EMPTY_FORM: SessionFormData = {
	sessionName: "",
	jobTitle: "",
	jobDescription: "",
} as const

type UploadStore = {
	files: UploadFile[]
	phase: UploadPhase
	formData: SessionFormData
	createErrorMessage?: string
	createErrorDetails?: string
	actions: {
		addFiles: (newFiles: File[]) => void
		removeFile: (id: number) => void
		clearAll: () => void
		clearFiles: () => void
		updateFileById: (id: number, updates: Partial<UploadFile>) => void
		setPhase: (phase: UploadPhase) => void
		setFormData: (data: Partial<SessionFormData>) => void
		setCreateError: (payload?: { message?: string; details?: string }) => void
	}
}

function canMutateFiles(phase: UploadPhase) {
	return phase !== "uploading" && phase !== "creating"
}

const uploadStore = create<UploadStore>()(
	persist(
		(set, get) => ({
			files: [],
			phase: "idle",
			formData: { ...EMPTY_FORM },
			createErrorMessage: undefined,
			createErrorDetails: undefined,

			actions: {
				addFiles: (newFiles: File[]) => {
					if (!canMutateFiles(get().phase))
						return

					const currentFiles = get().files

					if (currentFiles.length + newFiles.length > MAX_FILES_PER_SESSION)
						return

					const validFiles: UploadFile[] = []
					for (const file of newFiles) {
						if (file.size > MAX_FILE_BYTES)
							continue
						if (!ALLOWED_MIME_TYPES_LIST.includes(file.type as typeof ALLOWED_MIME_TYPES_LIST[number]))
							continue

						validFiles.push({
							id: ++_counter,
							file,
							originalName: file.name,
							size: file.size,
							mimeType: file.type,
							status: "ready",
							progress: 0,
						})
					}

					set({ files: [...currentFiles, ...validFiles] })
				},

				removeFile: (id: number) => {
					if (!canMutateFiles(get().phase))
						return

					const files = get().files.filter(f => f.id !== id)
					set({ files })
					if (files.length === 0)
						set({ phase: "idle" })
				},

				clearAll: () => {
					set({
						files: [],
						phase: "idle",
						formData: { ...EMPTY_FORM },
						createErrorMessage: undefined,
						createErrorDetails: undefined,
					})
				},

				clearFiles: () => {
					if (!canMutateFiles(get().phase))
						return

					set({
						files: [],
						phase: "idle",
						createErrorMessage: undefined,
						createErrorDetails: undefined,
					})
				},

				updateFileById: (id: number, updates: Partial<UploadFile>) => {
					set({
						files: get().files.map(file =>
							file.id === id ? { ...file, ...updates } : file,
						),
					})
				},

				setPhase: (phase: UploadPhase) => {
					set(state => ({
						phase,
						createErrorMessage: phase === "create_error" ? state.createErrorMessage : undefined,
						createErrorDetails: phase === "create_error" ? state.createErrorDetails : undefined,
					}))
				},

				setFormData: (data: Partial<SessionFormData>) => {
					set({ formData: { ...get().formData, ...data } })
				},

				setCreateError: (payload) => {
					set({
						createErrorMessage: payload?.message,
						createErrorDetails: payload?.details,
						phase: payload ? "create_error" : get().phase,
					})
				},
			},
		}),
		{
			name: "resumemo-uploads",
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				phase: state.phase,
				formData: state.formData,
				createErrorMessage: state.createErrorMessage,
				createErrorDetails: state.createErrorDetails,
				// Persist file metadata for display continuity, but File blobs
				// are not serializable; rehydration handles this.
				files: state.files.map(file => ({
					id: file.id,
					originalName: file.originalName,
					size: file.size,
					mimeType: file.mimeType,
					status: file.status,
					storageKey: file.storageKey,
					progress: file.progress,
					errorMessage: file.errorMessage,
				})),
			}),
			onRehydrateStorage: () => (state) => {
				if (!state)
					return

				// File blobs cannot survive serialization. On rehydrate:
				// - "done" phase: session was created successfully, clear everything.
				// - "uploading"/"creating" phase: upload was interrupted, mark as upload_error.
				//   Files have no blobs so they cannot be retried; clear them.
				// - "idle" phase: keep form data, but clear files since the File objects are gone.
				// - error phases: same as idle; form data survives, files do not.
				if (state.phase === "done") {
					state.files = []
					state.phase = "idle"
					state.formData = { ...EMPTY_FORM }
					state.createErrorMessage = undefined
					state.createErrorDetails = undefined
					return
				}

				if (state.phase === "uploading" || state.phase === "creating")
					state.phase = "upload_error"

				state.files = []
				state.phase = "idle"
				state.createErrorMessage = undefined
				state.createErrorDetails = undefined
			},
		},
	),
)

export const useUploadStore = uploadStore
export const useUploadFiles = () => uploadStore(state => state.files)
export const useUploadPhase = () => uploadStore(state => state.phase)
export const useUploadFormData = () => uploadStore(state => state.formData)
export const useUploadActions = () => uploadStore(state => state.actions)
