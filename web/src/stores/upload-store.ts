import { create } from "zustand"
import { persist } from "zustand/middleware"
import { MAX_BATCH_SIZE, MAX_FILE_SIZE, ALLOWED_MIME_TYPES_STRING } from "@/lib/constants"

export type UploadFile = {
  id: string
  file?: File // Not persisted to localStorage
  originalName: string
  size: number
  mimeType: string
  status: "pending" | "uploading" | "uploaded" | "error"
  progress: number
  errorMessage?: string
  uploadUrl?: string
}

interface UploadStore {
  files: UploadFile[]
  isUploading: boolean

  actions: {
    addFiles: (newFiles: File[]) => void
    removeFile: (id: string) => void
    clearAll: () => void
    clearCompleted: () => void
    updateFile: (id: string, updates: Partial<UploadFile>) => void
    setIsUploading: (value: boolean) => void
    restoreFileObject: (id: string, file: File) => void
  }
}

const uploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      files: [],
      isUploading: false,

      actions: {
        addFiles: (newFiles: File[]) => {
          const currentFiles = get().files
          
          if (currentFiles.length + newFiles.length > MAX_BATCH_SIZE)
            return

          const validFiles: UploadFile[] = []
          for (const file of newFiles) {
            if (!ALLOWED_MIME_TYPES_STRING.includes(file.type)) continue
            if (file.size > MAX_FILE_SIZE) continue
            if (currentFiles.some(f => f.originalName === file.name)) continue

            validFiles.push({
              id: crypto.randomUUID(),
              file,
              originalName: file.name,
              size: file.size,
              mimeType: file.type,
              status: "pending",
              progress: 0,
            })
          }

          set({ files: [...currentFiles, ...validFiles] })
        },

        removeFile: (id: string) => {
          set({ files: get().files.filter(f => f.id !== id) })
        },

        clearAll: () => {
          set({ files: [], isUploading: false })
        },

        clearCompleted: () => {
          set({ files: get().files.filter(f => f.status !== "uploaded") })
        },

        updateFile: (id: string, updates: Partial<UploadFile>) => {
          set({
            files: get().files.map(f => 
              f.id === id ? { ...f, ...updates } : f
            )
          })
        },

        setIsUploading: (value: boolean) => {
          set({ isUploading: value })
        },

        restoreFileObject: (id: string, file: File) => {
          set({
            files: get().files.map(f => 
              f.id === id ? { ...f, file } : f
            )
          })
        }
      }
    }),
    {
      name: "resumemo-uploads",
      partialize: (state) => ({
        files: state.files.map(f => ({ ...f, file: undefined })),
      }),
    }
  )
)

export const useUploadFiles   = () => uploadStore(state => state.files)
export const useIsUploading   = () => uploadStore(state => state.isUploading)
export const useUploadActions = () => uploadStore(state => state.actions)
