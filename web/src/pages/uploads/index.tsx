import { useCallback, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  FolderOpen,
  Layers,
  Loader2,
  UploadCloud,
  X,
  File,
  Trash2,
  Play,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { api } from "@/lib/api"

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_BATCH_SIZE = 100

type UploadFile = {
  id: string
  file: File
  originalName: string
  size: number
  mimeType: string
  status: "pending" | "uploading" | "uploaded" | "error"
  progress: number
  errorMessage?: string
  uploadUrl?: string
  storageKey?: string
}

export default function UploadPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const filesRef = useRef(files)
  
  // Keep ref in sync
  filesRef.current = files

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const addFiles = useCallback((newFiles: File[]) => {
    const currentFiles = filesRef.current
    
    if (currentFiles.length + newFiles.length > MAX_BATCH_SIZE) {
      toast.error(`Maximum ${MAX_BATCH_SIZE} files allowed per batch`)
      return
    }

    const validFiles: UploadFile[] = []
    
    for (const file of newFiles) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only PDF, DOCX, and TXT files allowed`)
        continue
      }
      
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name}: File too large (max 10MB)`)
        continue
      }

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

    setFiles(prev => [...prev, ...validFiles])
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }, [addFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : []
    addFiles(selectedFiles)
    e.target.value = ""
  }, [addFiles])

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const clearAll = () => {
    setFiles([])
  }

  const startUpload = async () => {
    if (files.length === 0) return
    
    setIsUploading(true)
    const pendingFiles = files.filter(f => f.status === "pending")
    
    try {
      // Request presigned URLs from API
      const { data, error } = await api.api.uploads.request.post({
        files: pendingFiles.map(f => ({
          name: f.originalName,
          size: f.size,
          mimeType: f.mimeType,
        })),
      })
      
      if (error || !data) throw new Error("Failed to get upload URLs")
      
      const { uploads } = data
      
      // Update files with upload URLs and IDs
      setFiles(prev => prev.map(f => {
        const upload = uploads.find((u: { originalName: string }) => u.originalName === f.originalName)
        if (upload) {
          return { ...f, id: upload.id, uploadUrl: upload.uploadUrl, storageKey: upload.storageKey }
        }
        return f
      }))

      // Upload all files in parallel
      await Promise.all(
        uploads.map(async (upload: { id: string; uploadUrl: string; originalName: string }) => {
          const fileData = pendingFiles.find(f => f.originalName === upload.originalName)
          if (!fileData) return

          // Mark as uploading
          setFiles(prev => prev.map(f => 
            f.originalName === upload.originalName ? { ...f, status: "uploading" } : f
          ))
          
          try {
            // Update API that upload started
            await api.api.uploads({ id: upload.id }).start.patch()

            // Upload to R2 via presigned URL
            const xhr = new XMLHttpRequest()
            
            await new Promise<void>((resolve, reject) => {
              xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                  const progress = Math.round((event.loaded / event.total) * 100)
                  setFiles(prev => prev.map(f => 
                    f.originalName === upload.originalName ? { ...f, progress } : f
                  ))
                  
                  // Update progress periodically
                  if (progress % 10 === 0) {
                    api.api.uploads({ id: upload.id }).progress.patch({ progress }).catch(console.error)
                  }
                }
              })
              
              xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve()
                }
                else {
                  reject(new Error(`Upload failed: ${xhr.statusText}`))
                }
              })
              
              xhr.addEventListener("error", () => reject(new Error("Upload failed")))
              
              xhr.open("PUT", upload.uploadUrl)
              xhr.setRequestHeader("Content-Type", fileData.mimeType)
              xhr.send(fileData.file)
            })

            // Mark as completed
            await api.api.uploads({ id: upload.id }).complete.patch()
            
            setFiles(prev => prev.map(f => 
              f.originalName === upload.originalName ? { ...f, status: "uploaded", progress: 100 } : f
            ))
          }
          catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Upload failed"
            
            await api.api.uploads({ id: upload.id }).fail.patch({ error: errorMessage })
            
            setFiles(prev => prev.map(f => 
              f.originalName === upload.originalName ? { ...f, status: "error", errorMessage } : f
            ))
            
            toast.error(`${upload.originalName}: ${errorMessage}`)
          }
        })
      )
      
      toast.success("Upload batch completed!")
    }
    catch (error) {
      toast.error("Failed to start upload batch")
      console.error(error)
    }
    finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const uploadedCount = files.filter(f => f.status === "uploaded").length
  const totalCount = files.length

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Badge className="w-fit bg-linear-to-br from-sky-500/80 to-violet-500/90 text-neutral-100">
            Batch Resume Upload
          </Badge>
          <h1 className="head-text-md text-foreground">Upload resumes for profiling</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Drag and drop resume files to upload them to cloud storage. Once uploaded, you can create profiling sessions 
            to analyze and score candidates against job descriptions.
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="border-none shadow-m">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Files Selected</CardDescription>
              <CardTitle className="text-3xl font-bold">{totalCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-m">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Uploaded</CardDescription>
              <CardTitle className="text-3xl font-bold text-emerald-500">{uploadedCount}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-none shadow-m">
            <CardHeader className="pb-3">
              <CardDescription className="text-xs uppercase tracking-wider">Pending</CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-500">{totalCount - uploadedCount}</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]"
      >
        {/* Upload Drop Zone */}
        <div className="flex flex-col gap-6">
          <Card className="border-dashed shadow-x">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold">Drop files here</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Support for PDF, DOCX, and TXT up to 10MB each
                </CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Layers className="size-3.5" /> Max {MAX_BATCH_SIZE} files
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <motion.div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={`
                  relative flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-xl 
                  border-2 border-dashed bg-muted/30 p-8 text-center cursor-pointer
                  transition-all duration-200
                  ${isDragging 
                    ? "border-primary bg-primary/5 scale-[1.02]" 
                    : "border-muted-foreground/40 hover:border-primary/50 hover:bg-muted/50"
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <motion.div 
                  animate={{ y: isDragging ? -5 : 0 }}
                  className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary"
                >
                  <UploadCloud className="size-8" />
                </motion.div>
                
                <div className="space-y-2">
                  <p className="text-base font-medium text-foreground">
                    Drag & drop resumes or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    PDF, DOCX, TXT up to 10MB each
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3" /> Individual files
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FolderOpen className="size-3" /> Or entire folders
                  </span>
                </div>
              </motion.div>

              {/* Upload Button */}
              {files.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-3"
                >
                  <Button
                    onClick={startUpload}
                    disabled={isUploading || files.every(f => f.status === "uploaded")}
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="size-4" />
                        Upload {files.filter(f => f.status !== "uploaded").length} files
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={clearAll}
                    disabled={isUploading}
                    size="lg"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </motion.div>
              )}

              {/* Success message for all uploaded */}
              {files.length > 0 && files.every(f => f.status === "uploaded") && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-emerald-600">
                    <CheckCircle2 className="size-5" />
                    <span className="font-medium">All files uploaded successfully!</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Ready to create a profiling session? 
                  </p>
                  <Button 
                    onClick={() => navigate("/profiling/new")}
                    className="mt-3 gap-2"
                  >
                    Start Profiling
                    <ArrowRight className="size-4" />
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* File Queue */}
        <Card className="h-full max-h-[600px] flex flex-col shadow-x border-none">
          <CardHeader className="shrink-0 flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold">Upload Queue</CardTitle>
              <CardDescription className="text-sm mt-1">
                {totalCount} files queued
              </CardDescription>
            </div>
            {isUploading && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Loader2 className="size-3 animate-spin" /> Uploading
              </Badge>
            )}
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {files.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center text-muted-foreground"
                >
                  <File className="size-12 mb-3 opacity-20" />
                  <p className="text-sm">No files selected</p>
                  <p className="text-xs mt-1">Drop files to get started</p>
                </motion.div>
              ) : (
                files.map((file) => (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="rounded-lg border-none bg-muted/30 dark:bg-muted/20 p-3 shadow-m"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {file.originalName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {file.status === "uploaded" && (
                          <CheckCircle2 className="size-4 text-emerald-500" />
                        )}
                        {file.status === "error" && (
                          <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                            Error
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-6 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => removeFile(file.id)}
                          disabled={file.status === "uploading"}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress bar */}
                    <div className="mt-3 space-y-1">
                      <Progress 
                        value={file.progress} 
                        className="h-1.5"
                      />
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>
                          {file.status === "pending" && "Waiting..."}
                          {file.status === "uploading" && "Uploading..."}
                          {file.status === "uploaded" && "Complete"}
                          {file.status === "error" && file.errorMessage}
                        </span>
                        <span>{file.progress}%</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </CardContent>
          
          {files.length > 0 && (
            <CardFooter className="shrink-0 flex-col gap-3 border-t bg-muted/20 py-4">
              <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span className="font-medium text-foreground">
                  {uploadedCount} / {totalCount}
                </span>
              </div>
              <Progress 
                value={totalCount > 0 ? (uploadedCount / totalCount) * 100 : 0} 
                className="h-2"
              />
              
              {files.some(f => f.status === "uploaded") && (
                <Button
                  onClick={() => navigate("/profiling/new")}
                  variant="secondary"
                  className="w-full gap-2"
                >
                  <Play className="size-4" />
                  Create Profiling Session
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      </motion.section>
    </div>
  )
}
