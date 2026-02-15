import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import {
	MAX_FILES_PER_SESSION,
	MAX_FILE_BYTES,
	ALLOWED_MIME_TYPES_LIST,
} from "@/lib/constants"

let _counter = 0

/**
 * Client-side file status — purely for UI state.
 *
 * Lifecycle (v2 — no hashing/dedup):
 *   ready → uploading → done | failed
 *
 * Files are immediately "ready" on add — no async fingerprinting step.
 */
export type FileStatus = "ready" | "uploading" | "done" | "failed"

export type UploadFile = {
	id: number
	file: File
	originalName: string
	size: number
	mimeType: string
	status: FileStatus
	/** Upload progress 0-100. Only meaningful when status is "uploading". */
	progress: number
	errorMessage?: string
}

/**
 * Upload phase — overall orchestration state.
 *
 * idle      → user is adding files / filling form
 * uploading → presign + PUT requests in flight
 * creating  → files uploaded, session creation POST in flight
 * done      → session created, navigating away
 * error     → something failed (user can retry or reset)
 */
export type UploadPhase = "idle" | "uploading" | "creating" | "done" | "error"

export type SessionFormData = {
	sessionName: string
	jobTitle: string
	jobDescription: string
}

const EMPTY_FORM: SessionFormData = {
	sessionName: "",
	jobTitle: "",
	jobDescription: "",
}

interface UploadStoreV2 {
	files: UploadFile[]
	phase: UploadPhase
	formData: SessionFormData

	actions: {
		addFiles: (newFiles: File[]) => void
		removeFile: (id: number) => void
		clearAll: () => void
		clearFiles: () => void
		updateFileById: (id: number, updates: Partial<UploadFile>) => void
		setPhase: (phase: UploadPhase) => void
		setFormData: (data: Partial<SessionFormData>) => void
	}
}

const uploadStoreV2 = create<UploadStoreV2>()(
	persist(
		(set, get) => ({
			files: [],
			phase: "idle",
			formData: { ...EMPTY_FORM },

			actions: {
				addFiles: (newFiles: File[]) => {
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
					const files = get().files.filter(f => f.id !== id)
					set({ files })
					if (files.length === 0) set({ phase: "idle" })
				},

				clearAll: () => {
					set({ files: [], phase: "idle", formData: { ...EMPTY_FORM } })
				},

				clearFiles: () => {
					set({ files: [], phase: "idle" })
				},

				updateFileById: (id: number, updates: Partial<UploadFile>) => {
					set({
						files: get().files.map(f =>
							f.id === id ? { ...f, ...updates } : f,
						),
					})
				},

				setPhase: (phase: UploadPhase) => {
					set({ phase })
				},

				setFormData: (data: Partial<SessionFormData>) => {
					set({ formData: { ...get().formData, ...data } })
				},
			},
		}),
		{
			name: "resumemo-uploads-v2",
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				phase: state.phase,
				formData: state.formData,
				// Persist file metadata for display continuity, but File blobs
				// are not serializable — rehydration handles this.
				files: state.files.map(f => ({
					id: f.id,
					originalName: f.originalName,
					size: f.size,
					mimeType: f.mimeType,
					status: f.status,
					progress: f.progress,
					errorMessage: f.errorMessage,
				})),
			}),
			onRehydrateStorage: () => (state) => {
				if (!state) return

				// File blobs can't survive serialization. On rehydrate:
				// - "done" phase: session was created successfully, clear everything.
				// - "uploading"/"creating" phase: upload was interrupted, mark as error.
				//   Files have no blobs so they can't be retried — clear them.
				// - "idle" phase: keep form data (it's just strings), but clear files
				//   since the File objects are gone.
				// - "error" phase: same as idle — form data survives, files don't.

				if (state.phase === "done") {
					state.files = []
					state.phase = "idle"
					state.formData = { ...EMPTY_FORM }
					return
				}

				if (state.phase === "uploading" || state.phase === "creating") {
					state.phase = "error"
				}

				// Files without blobs are useless — clear them but keep form data
				state.files = []
			},
		},
	),
)

export const useUploadFiles = () => uploadStoreV2(state => state.files)
export const useUploadPhase = () => uploadStoreV2(state => state.phase)
export const useUploadFormData = () => uploadStoreV2(state => state.formData)
export const useUploadActions = () => uploadStoreV2(state => state.actions)
