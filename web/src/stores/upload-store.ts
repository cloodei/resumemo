import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { MAX_FILES_PER_SESSION, MAX_FILE_BYTES, ALLOWED_MIME_TYPES_LIST } from "@/lib/constants"
import { computeFingerprint } from "@/lib/fingerprint"

var _counter = 0

/**
 * Client-side file status — purely for UI state, never persisted to DB.
 *
 * Lifecycle:
 *   selected → hashing → ready → uploading → done | failed | reused
 */
export type FileStatus = "selected" | "ready" | "uploading" | "done" | "reused" | "failed"

export type UploadFile = {
	id: number
	file: File
	originalName: string
	size: number
	mimeType: string
	status: FileStatus
	fingerprint?: string
	errorMessage?: string
	/** Server-side file ID (set after upload completes or dedup match). */
	fileId?: string
}

/**
 * Upload phase — overall orchestration state.
 *
 * idle      → user is adding files
 * hashing   → computing fingerprints (auto-triggered on file add)
 * uploading → single multipart POST in flight (SSE stream active)
 * done      → all complete, navigating away
 * error     → something failed
 */
export type UploadPhase = "idle" | "hashing" | "uploading" | "done" | "error"

interface UploadStore {
	files: UploadFile[]
	phase: UploadPhase
	/** Session ID received from SSE session:created event. */
	sessionId: string | null

	actions: {
		addFiles: (newFiles: File[]) => void
		removeFile: (id: number) => void
		clearAll: () => void
		updateFileById: (id: number, updates: Partial<UploadFile>) => void
		updateFileByName: (name: string, updates: Partial<UploadFile>) => void
		setPhase: (phase: UploadPhase) => void
		setSessionId: (id: string | null) => void
		hashFiles: () => Promise<void>
		checkAndHash: () => Promise<void>
	}
}

const uploadStore = create<UploadStore>()(
	persist(
		(set, get) => ({
			files: [],
			phase: "idle",
			sessionId: null,

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

						/**
						 * TODO: implement duplicate file check
						 * ASSUME PREVIOUSLY SELECTED FILES ARE NOT DUPLICATES
						 */
						// if (currentFiles.some(f => f.originalName === file.name && f.size === file.size))
						// 	continue

						validFiles.push({
							id: ++_counter,
							file,
							originalName: file.name,
							size: file.size,
							mimeType: file.type,
							status: "selected",
						})
					}

					set({ files: [...currentFiles, ...validFiles] })
				},

				removeFile: (id: number) => {
					const files = get().files.filter(f => f.id !== id)
					set({ files })
					if (files.length === 0) set({ phase: "idle", sessionId: null })
				},

				clearAll: () => {
					set({ files: [], phase: "idle", sessionId: null })
				},

				updateFileByName: (name: string, updates: Partial<UploadFile>) => {
					set({
						files: get().files.map(f =>
							f.originalName === name ? { ...f, ...updates } : f,
						),
					})
				},

				setPhase: (phase: UploadPhase) => {
					set({ phase })
				},

				setSessionId: (id: string | null) => {
					set({ sessionId: id })
				},

				updateFileById: (id: number, updates: Partial<UploadFile>) => {
					set({
						files: get().files.map(f =>
							f.id === id ? { ...f, ...updates } : f,
						),
					})
				},

				/**
				 * Compute XXH64 fingerprints for all files that don't have one yet.
				 * Runs in the background as soon as files are added.
				 */
				hashFiles: async () => {
					const { files, actions } = get()
					for (let i = 0; i < files.length; ++i) {
						const file = files[i]
						if (file.status !== "selected") continue

						try {
							const fingerprint = await computeFingerprint(file.file)
							actions.updateFileById(file.id, { status: "ready", fingerprint })
						}
						catch {
							actions.updateFileById(file.id, {
								status: "failed",
								errorMessage: "Could not read file",
							})
						}
					}
				},

				checkAndHash: async () => {
					const files = get().files

					for (let i = 0; i < files.length; ++i) {
						const file = files[i]
						if (file.status !== "selected" || file.fingerprint)
							continue

						const fingerprint = await computeFingerprint(file.file)
						set({
							files: files.map(f =>
								f.id === file.id ? { ...f, status: "ready", fingerprint } : f,
							),
						})
					}
				},
			},
		}),
		{
			name: "resumemo-uploads",
			storage: createJSONStorage(() => sessionStorage),
			partialize: (state) => ({
				phase: state.phase,
				sessionId: state.sessionId,
				files: state.files.map(f => ({
					id: f.id,
					originalName: f.originalName,
					size: f.size,
					mimeType: f.mimeType,
					status: f.status === "uploading" ? "ready" : f.status,
					fingerprint: f.fingerprint,
					fileId: f.fileId,
				})),
			}),
			onRehydrateStorage: () => (state) => {
				if (state) {
					state.files = state.files.filter(f =>
						f.status === "done" || f.status === "reused",
					)
				}
			},
		},
	),
)

export const useUploadFiles = () => uploadStore(state => state.files)
export const useUploadPhase = () => uploadStore(state => state.phase)
export const useUploadSessionId = () => uploadStore(state => state.sessionId)
export const useUploadActions = () => uploadStore(state => state.actions)
