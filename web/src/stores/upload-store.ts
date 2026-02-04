import { create } from "zustand"
import { persist } from "zustand/middleware"

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
  
  // Actions
  addFiles: (newFiles: File[]) => void
  removeFile: (id: string) => void
  clearAll: () => void
  clearCompleted: () => void
  
  updateFile: (id: string, updates: Partial<UploadFile>) => void
  setIsUploading: (value: boolean) => void
  
  // Restore file objects after page reload (must be re-added)
  restoreFileObject: (id: string, file: File) => void
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BATCH_SIZE = 50

const uploadStore = create<UploadStore>()(
  persist(
    (set, get) => ({
      files: [],
      isUploading: false,

      addFiles: (newFiles: File[]) => {
        const currentFiles = get().files
        
        if (currentFiles.length + newFiles.length > MAX_BATCH_SIZE) {
          return // Caller should handle this with toast
        }

        const validFiles: UploadFile[] = []
        
        for (const file of newFiles) {
          if (!ALLOWED_MIME_TYPES.includes(file.type)) continue
          if (file.size > MAX_FILE_SIZE) continue
          
          // Check for duplicates by name
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
      },
    }),
    {
      name: "resumemo-uploads",
      // Don't persist file objects (they can't be serialized)
      partialize: (state) => ({
        files: state.files.map(f => ({ ...f, file: undefined })),
      }),
    }
  )
)

// Hooks
export const useUploadFiles = () => uploadStore(state => state.files)
export const useIsUploading = () => uploadStore(state => state.isUploading)
export const useUploadActions = () => uploadStore(state => ({
  addFiles: state.addFiles,
  removeFile: state.removeFile,
  clearAll: state.clearAll,
  clearCompleted: state.clearCompleted,
  updateFile: state.updateFile,
  setIsUploading: state.setIsUploading,
  restoreFileObject: state.restoreFileObject,
}))

// Constants export for use in components
export { MAX_BATCH_SIZE, MAX_FILE_SIZE, ALLOWED_MIME_TYPES }
