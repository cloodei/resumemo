import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { MAX_BATCH_SIZE, MAX_FILE_SIZE, ALLOWED_MIME_TYPES_STRING } from "@/lib/constants"
import { computeFingerprint } from "@/lib/fingerprint"

/**
 * Client-side file status — purely for UI state, never persisted to DB.
 *
 * - selected:  user added the file, not yet fingerprinted
 * - hashing:   computing the partial SHA-256 fingerprint
 * - ready:     fingerprint computed, waiting for user to start upload
 * - uploading: XHR upload in progress
 * - uploaded:  successfully uploaded to R2
 * - reused:    server detected a duplicate, no upload needed
 * - failed:    upload or hashing failed
 */
export type FileStatus = "selected" | "hashing" | "ready" | "uploading" | "uploaded" | "reused" | "failed"

export type UploadFile = {
	id: string
	file: File
	originalName: string
	size: number
	mimeType: string
	status: FileStatus
	progress: number
	fingerprint?: string
	errorMessage?: string
	serverId?: string
}

type UploadPhase = "idle" | "hashing" | "creating" | "uploading" | "confirming" | "done" | "error"

interface UploadStore {
	files: UploadFile[]
	phase: UploadPhase

	actions: {
		addFiles: (newFiles: File[]) => void
		removeFile: (id: string) => void
		clearAll: () => void
		updateFile: (id: string, updates: Partial<UploadFile>) => void
		setPhase: (phase: UploadPhase) => void
		hashFiles: () => Promise<void>
	}
}

const uploadStore = create<UploadStore>()(
	persist(
		(set, get) => ({
			files: [],
			phase: "idle",

			actions: {
				addFiles: (newFiles: File[]) => {
					const currentFiles = get().files

					if (currentFiles.length + newFiles.length > MAX_BATCH_SIZE) return

					const validFiles: UploadFile[] = []
					for (const file of newFiles) {
						if (!ALLOWED_MIME_TYPES_STRING.includes(file.type)) continue
						if (file.size > MAX_FILE_SIZE) continue
						if (currentFiles.some(f => f.originalName === file.name && f.size === file.size)) continue

						validFiles.push({
							id: crypto.randomUUID(),
							file,
							originalName: file.name,
							size: file.size,
							mimeType: file.type,
							status: "selected",
							progress: 0,
						})
					}

					set({ files: [...currentFiles, ...validFiles] })
				},

				removeFile: (id: string) => {
					const files = get().files.filter(f => f.id !== id)
					set({ files })
					if (files.length === 0) set({ phase: "idle" })
				},

				clearAll: () => {
					set({ files: [], phase: "idle" })
				},

				updateFile: (id: string, updates: Partial<UploadFile>) => {
					set({
						files: get().files.map(f =>
							f.id === id ? { ...f, ...updates } : f,
						),
					})
				},

				setPhase: (phase: UploadPhase) => {
					set({ phase })
				},

				/**
				 * Compute fingerprints for all files that don't have one yet.
				 * This runs in the background as soon as files are added so that
				 * when the user clicks "Upload" we can immediately send
				 * fingerprints to the server for dedup.
				 */
				hashFiles: async () => {
					const { files, actions } = get()
					for (let i = 0; i < files.length; ++i) {
						const file = files[i]
						if (file.status !== "selected")
							continue

						actions.updateFile(file.id, { status: "hashing" })

						try {
							const fingerprint = await computeFingerprint(file.file)
							actions.updateFile(file.id, { status: "ready", fingerprint })
						}
						catch {
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
				// Note: files can't be fully restored since File objects aren't serializable
				// This mainly preserves phase state and metadata for page refreshes
				phase: state.phase,
				// Store file metadata only (without the File object)
				files: state.files.map(f => ({
					id: f.id,
					originalName: f.originalName,
					size: f.size,
					mimeType: f.mimeType,
					status: f.status === "uploading" ? "ready" : f.status, // Reset uploading to ready on restore
					progress: f.status === "uploaded" || f.status === "reused" ? 100 : 0,
					fingerprint: f.fingerprint,
					serverId: f.serverId,
				})),
			}),
			onRehydrateStorage: () => (state) => {
				if (state) {
					// Files without File objects need to be re-added by user
					// Mark them with a special status or filter them out
					state.files = state.files.filter(f => 
						f.status === "uploaded" || f.status === "reused"
					)
				}
			},
		},
	),
)

export const useUploadFiles 	= () => uploadStore(state => state.files)
export const useUploadPhase 	= () => uploadStore(state => state.phase)
export const useUploadActions = () => uploadStore(state => state.actions)
