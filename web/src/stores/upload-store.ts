import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { MAX_FILES_PER_SESSION, MAX_FILE_BYTES, ALLOWED_MIME_TYPES_LIST } from "@/lib/constants"
import { computeFingerprint } from "@/lib/fingerprint"

/**
 * Client-side file status — purely for UI state, never persisted to DB.
 *
 * Lifecycle:
 *   selected → hashing → ready → uploading → done | failed | reused
 *
 * - selected:   user added the file, not yet fingerprinted
 * - hashing:    computing the XXH64 fingerprint
 * - ready:      fingerprint computed, waiting for upload
 * - uploading:  server is processing this file (SSE stream active)
 * - done:       successfully uploaded to R2 and saved
 * - reused:     server/client detected a duplicate, no upload needed
 * - failed:     hashing or upload failed
 */
export type FileStatus = "selected" | "hashing" | "ready" | "uploading" | "done" | "reused" | "failed"

export type UploadFile = {
	id: string
	file: File
	originalName: string
	size: number
	mimeType: string
	status: FileStatus
	fingerprint?: string
	errorMessage?: string
	/** Server-side file ID (set after upload or dedup match). */
	fileId?: string
}

/**
 * Upload phase — overall orchestration state.
 *
 * idle     → user is adding files
 * hashing  → computing fingerprints (auto-triggered)
 * creating → POST /sessions (metadata only)
 * checking → POST /sessions/:id/check-duplicates
 * uploading → POST /sessions/:id/upload (SSE stream)
 * done     → all complete, navigating away
 * error    → something failed
 */
export type UploadPhase = "idle" | "hashing" | "creating" | "checking" | "uploading" | "done" | "error"

interface UploadStore {
	files: UploadFile[]
	phase: UploadPhase
	/** Session ID set after successful session creation. */
	sessionId: string | null

	actions: {
		addFiles: (newFiles: File[]) => void
		removeFile: (id: string) => void
		clearAll: () => void
		updateFile: (id: string, updates: Partial<UploadFile>) => void
		updateFileByName: (name: string, updates: Partial<UploadFile>) => void
		setPhase: (phase: UploadPhase) => void
		setSessionId: (id: string | null) => void
		hashFiles: () => Promise<void>
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

					if (currentFiles.length + newFiles.length > MAX_FILES_PER_SESSION) return

					const validFiles: UploadFile[] = []
					for (const file of newFiles) {
						if (!ALLOWED_MIME_TYPES_LIST.includes(file.type as typeof ALLOWED_MIME_TYPES_LIST[number])) continue
						if (file.size > MAX_FILE_BYTES) continue
						if (currentFiles.some(f => f.originalName === file.name && f.size === file.size)) continue

						validFiles.push({
							id: crypto.randomUUID(),
							file,
							originalName: file.name,
							size: file.size,
							mimeType: file.type,
							status: "selected",
						})
					}

					set({ files: [...currentFiles, ...validFiles] })
				},

				removeFile: (id: string) => {
					const files = get().files.filter(f => f.id !== id)
					set({ files })
					if (files.length === 0) set({ phase: "idle", sessionId: null })
				},

				clearAll: () => {
					set({ files: [], phase: "idle", sessionId: null })
				},

				updateFile: (id: string, updates: Partial<UploadFile>) => {
					set({
						files: get().files.map(f =>
							f.id === id ? { ...f, ...updates } : f,
						),
					})
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

				/**
				 * Compute XXH64 fingerprints for all files that don't have one yet.
				 * Runs in the background as soon as files are added so fingerprints
				 * are ready when the user clicks "Upload".
				 */
				hashFiles: async () => {
					const { files, actions } = get()
					for (let i = 0; i < files.length; ++i) {
						const file = files[i]
						if (file.status !== "selected") continue

						actions.updateFile(file.id, { status: "hashing" })

						try {
							const fingerprint = await computeFingerprint(file.file)
							actions.updateFile(file.id, { status: "ready", fingerprint })
						} catch {
							actions.updateFile(file.id, {
								status: "failed",
								errorMessage: "Could not read file",
							})
						}
					}
				},
			},
		}),
		{
			name: "resumemo-uploads",
			storage: createJSONStorage(() => sessionStorage),
			// Only persist serializable data (not File objects)
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
					// Files without File objects can't be re-uploaded — keep only completed ones
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
