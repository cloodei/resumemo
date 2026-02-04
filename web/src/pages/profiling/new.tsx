import { Link } from "react-router-dom"
import { motion, AnimatePresence } from "motion/react"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useUploadFiles, useIsUploading, useUploadActions, MAX_BATCH_SIZE, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/stores/upload-store"
import { api } from "@/lib/api"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

const steps = [
  {
    id: 1,
    title: "Describe the role",
    description: "Provide a job description or select a template.",
  },
  {
    id: 2,
    title: "Upload resumes",
    description: "Drag & drop PDF, DOCX, or TXT files.",
  },
  {
    id: 3,
    title: "Review & launch",
    description: "Confirm details and start profiling.",
  },
]

const jdTemplates = [
  {
    title: "Senior Frontend Engineer",
    summary: "React, TypeScript, accessibility, and design systems.",
  },
  {
    title: "AI Research Scientist",
    summary: "Model deployment, LLM tuning, and experimentation cadence.",
  },
]

export default function NewProfilingPage() {
  const navigate = useNavigate()
  const files = useUploadFiles()
  const isUploading = useIsUploading()
  const { addFiles, removeFile, clearAll, updateFile, setIsUploading } = useUploadActions()
  
  const [isDragging, setIsDragging] = useState(false)
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleAddFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > MAX_BATCH_SIZE) {
      toast.error(`Maximum ${MAX_BATCH_SIZE} files allowed per batch`)
      return
    }

    const invalidFiles: string[] = []
    const validFiles: File[] = []

    for (const file of newFiles) {
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        invalidFiles.push(`${file.name}: Only PDF, DOCX, and TXT allowed`)
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        invalidFiles.push(`${file.name}: File too large (max 10MB)`)
        continue
      }
      if (files.some(f => f.originalName === file.name)) {
        invalidFiles.push(`${file.name}: Already added`)
        continue
      }
      validFiles.push(file)
    }

    invalidFiles.forEach(msg => toast.error(msg))
    addFiles(validFiles)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    handleAddFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : []
    handleAddFiles(selectedFiles)
    e.target.value = ""
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const pendingFiles = files.filter(f => f.status === "pending")
  const uploadedFiles = files.filter(f => f.status === "uploaded")
  const canUpload = pendingFiles.length > 0 && pendingFiles.every(f => f.file)
  const canLaunch = uploadedFiles.length > 0 && jobDescription.trim().length >= 50

  const startUpload = async () => {
    if (!canUpload) {
      toast.error("Please add files with valid file data to upload")
      return
    }
    
    setIsUploading(true)
    
    try {
      const { data, error } = await api.api.uploads.request.post({
        files: pendingFiles.map(f => ({
          name: f.originalName,
          size: f.size,
          mimeType: f.mimeType,
        })),
      })
      
      if (error || !data) throw new Error("Failed to prepare uploads")
      
      const { uploads } = data

      // Upload all files
      await Promise.all(
        uploads.map(async (upload: { id: string; uploadUrl: string; originalName: string }) => {
          const fileData = pendingFiles.find(f => f.originalName === upload.originalName)
          if (!fileData?.file) return

          updateFile(fileData.id, { status: "uploading", uploadUrl: upload.uploadUrl })
          
          try {
            await api.api.uploads({ id: upload.id }).start.patch()

            const xhr = new XMLHttpRequest()
            
            await new Promise<void>((resolve, reject) => {
              xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                  const progress = Math.round((event.loaded / event.total) * 100)
                  updateFile(fileData.id, { progress })
                }
              })
              
              xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve()
                else reject(new Error("Upload failed"))
              })
              
              xhr.addEventListener("error", () => reject(new Error("Upload failed")))
              
              xhr.open("PUT", upload.uploadUrl)
              xhr.setRequestHeader("Content-Type", fileData.mimeType)
              xhr.send(fileData.file)
            })

            await api.api.uploads({ id: upload.id }).complete.patch()
            updateFile(fileData.id, { id: upload.id, status: "uploaded", progress: 100 })
          }
          catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Upload failed"
            await api.api.uploads({ id: upload.id }).fail.patch({ error: errorMessage }).catch(() => {})
            updateFile(fileData.id, { status: "error", errorMessage })
          }
        })
      )
      
      toast.success("Files uploaded successfully!")
    }
    catch (error) {
      toast.error("Failed to upload files")
      console.error(error)
    }
    finally {
      setIsUploading(false)
    }
  }

  const handleLaunchProfiling = async () => {
    if (!canLaunch) {
      if (uploadedFiles.length === 0) toast.error("Upload at least one resume first")
      else toast.error("Job description must be at least 50 characters")
      return
    }

    try {
      const fileIds = uploadedFiles.map(f => f.id)
      const { data, error } = await api.api.profiling.post({
        jobTitle: jobTitle || undefined,
        jobDescription: jobDescription.trim(),
        fileIds,
      })

      if (error || !data || !data.session) {
        throw new Error("Failed to create profiling session")
      }

      clearAll()
      toast.success("Profiling session created!")
      navigate(`/profiling/${data.session.id}`)
    }
    catch (error) {
      toast.error("Failed to create profiling session")
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header with step cards */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <Badge className="w-fit bg-linear-to-br from-sky-500/80 to-violet-500/90 text-neutral-100">
            Create a new profiling session
          </Badge>
          <h1 className="head-text-md text-foreground">Upload, describe, and launch</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Set up your job description, add candidate resumes, and launch AI-powered profiling to rank and score candidates.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {steps.map((step) => (
            <Card 
              key={step.id} 
              className="group relative overflow-hidden transition-all border-dashed dark:hover:border-transparent shadow-m hover:shadow-l hover:border-primary/30 hover:-translate-y-0.5"
            >
              <CardHeader className="gap-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted shadow-m font-medium group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {step.id}
                  </span>
                  {step.title}
                </CardTitle>
                <CardDescription>{step.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </motion.section>

      {/* Main content: Job description + Resume upload */}
      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid gap-6 lg:grid-cols-2"
      >
        {/* Job Description Card */}
        <Card className="shadow-x border-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Job description</CardTitle>
              <CardDescription className="text-sm mt-1">
                Paste your job description or choose from templates.
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              className="shadow-m hover:shadow-l transition-all"
            >
              Import from library
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <label className="text-sm font-medium text-foreground" htmlFor="job-title">
                Job title
              </label>
              <Input 
                id="job-title" 
                placeholder="e.g. Staff Product Designer" 
                className="h-11"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground" htmlFor="job-description">
                  Job description detail
                </label>
                <span className={`text-xs ${jobDescription.length < 50 ? "text-muted-foreground" : "text-emerald-500"}`}>
                  {jobDescription.length < 50 ? `Min 50 characters` : "✓ Ready"}
                </span>
              </div>
              <Textarea
                id="job-description"
                placeholder="Describe responsibilities, skills, and must-have experience..."
                className="min-h-[180px] resize-none"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
            </div>
            <Tabs defaultValue="templates" className="pt-2">
              <TabsList>
                <TabsTrigger className="border-none cursor-pointer" value="templates">Templates</TabsTrigger>
                <TabsTrigger className="border-none cursor-pointer" value="history">Recent sessions</TabsTrigger>
              </TabsList>
              <TabsContent value="templates" className="mt-4 grid gap-3 md:grid-cols-2">
                {jdTemplates.map((template) => (
                  <div
                    key={template.title}
                    className="group rounded-lg border border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-l hover:-translate-y-0.5 cursor-pointer"
                    onClick={() => {
                      setJobTitle(template.title)
                      setJobDescription(template.summary + "\n\nAdd more details about the role...")
                    }}
                  >
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{template.title}</p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{template.summary}</p>
                    <Button size="sm" variant="ghost" className="mt-4 h-9 px-3">
                      Use template
                    </Button>
                  </div>
                ))}
              </TabsContent>
              <TabsContent value="history" className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Recently launched sessions will appear here to quickly duplicate configurations.</p>
                <Button size="sm" variant="outline" className="h-9 px-3">
                  View session history
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Resume Upload Card */}
        <Card className="border-dashed shadow-x">
          <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Resume upload</CardTitle>
              <CardDescription className="text-sm mt-1">Drop resumes to add them to your session.</CardDescription>
            </div>
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <UploadCloud className="size-3.5" /> Cloud Upload
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <motion.div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.995 }}
              className={`
                relative flex min-h-[200px] flex-col items-center justify-center gap-4 
                rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center cursor-pointer
                transition-colors duration-200
                ${isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/40 hover:border-primary/50 hover:bg-muted/50"
                }
              `}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UploadCloud className="size-6" />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Drag & drop resumes or click to browse
                </p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, TXT up to 10MB each</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Layers className="size-3" /> Batch up to {MAX_BATCH_SIZE} files
                </span>
                <span className="inline-flex items-center gap-1">
                  <FileText className="size-3" /> File info auto-detected
                </span>
              </div>
              <Button size="sm" className="mt-2" onClick={(e) => e.stopPropagation()}>
                Browse files
              </Button>
            </motion.div>

            {files.length > 0 && (
              <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                <p className="flex items-center gap-2 text-foreground">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  {files.length} file{files.length !== 1 ? "s" : ""} in queue
                  {uploadedFiles.length > 0 && ` (${uploadedFiles.length} uploaded)`}
                </p>
                <p className="mt-2 text-xs">
                  Your file queue is saved and will persist even if you leave this page.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-between">
            <div className="text-xs text-muted-foreground">
              Need help? <Link to="/support" className="underline">Check the upload guide</Link>
            </div>
          </CardFooter>
        </Card>
      </motion.section>

      {/* Upload Queue Section - Shows at bottom when files exist */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="shadow-x border-none">
              <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Upload queue</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    {files.length} file{files.length !== 1 ? "s" : ""} • {uploadedFiles.length} uploaded • {pendingFiles.length} pending
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isUploading && (
                    <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                      <Loader2 className="size-3 animate-spin" /> Uploading
                    </Badge>
                  )}
                  <Button variant="ghost" size="sm" onClick={clearAll} disabled={isUploading}>
                    Clear all
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-lg border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FileText className="size-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">{file.originalName}</p>
                            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {file.status === "uploaded" && (
                            <CheckCircle2 className="size-4 text-emerald-500" />
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => removeFile(file.id)}
                            disabled={file.status === "uploading"}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1">
                        <Progress value={file.progress} className="h-1.5" />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>
                            {file.status === "pending" && (file.file ? "Ready" : "File data missing")}
                            {file.status === "uploading" && "Uploading..."}
                            {file.status === "uploaded" && "Complete"}
                            {file.status === "error" && (file.errorMessage || "Failed")}
                          </span>
                          <span>{file.progress}%</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t bg-muted/20 py-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Progress</span>
                    <span className="font-medium text-foreground">{uploadedFiles.length} / {files.length}</span>
                  </div>
                  <Progress 
                    value={files.length > 0 ? (uploadedFiles.length / files.length) * 100 : 0} 
                    className="h-2 w-24"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button 
                    variant="secondary"
                    className="flex-1 sm:flex-none gap-2"
                    disabled={!canUpload || isUploading}
                    onClick={startUpload}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="size-4" />
                        Upload {pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""}
                      </>
                    )}
                  </Button>
                  <Button 
                    className="flex-1 sm:flex-none gap-2"
                    disabled={!canLaunch}
                    onClick={handleLaunchProfiling}
                  >
                    Launch profiling
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
