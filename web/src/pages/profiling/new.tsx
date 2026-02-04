import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { toast } from "sonner"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Layers,
  Loader2,
  UploadCloud,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"

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
}

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const MAX_BATCH_SIZE = 50

export default function NewProfilingPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
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

  const addFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > MAX_BATCH_SIZE) {
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
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFiles = Array.from(e.dataTransfer.files)
    addFiles(droppedFiles)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files ? Array.from(e.target.files) : []
    addFiles(selectedFiles)
    e.target.value = ""
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const canSubmit = files.length > 0 && jobDescription.trim().length >= 50
  const uploadedCount = files.filter(f => f.status === "uploaded").length
  const pendingCount = files.filter(f => f.status === "pending").length
  const isAllUploaded = files.length > 0 && files.every(f => f.status === "uploaded")

  const startUpload = async () => {
    if (files.length === 0 || !canSubmit) return
    
    setIsUploading(true)
    const pendingFiles = files.filter(f => f.status === "pending")
    
    try {
      // Request upload URLs from API
      const { data, error } = await api.api.uploads.request.post({
        files: pendingFiles.map(f => ({
          name: f.originalName,
          size: f.size,
          mimeType: f.mimeType,
        })),
      })
      
      if (error || !data) throw new Error("Failed to prepare uploads")
      
      const { uploads } = data
      
      // Update files with upload info
      setFiles(prev => prev.map(f => {
        const upload = uploads.find((u: { originalName: string }) => u.originalName === f.originalName)
        if (upload) {
          return { ...f, id: upload.id, uploadUrl: upload.uploadUrl }
        }
        return f
      }))

      // Upload all files
      await Promise.all(
        uploads.map(async (upload: { id: string; uploadUrl: string; originalName: string }) => {
          const fileData = pendingFiles.find(f => f.originalName === upload.originalName)
          if (!fileData) return

          setFiles(prev => prev.map(f => 
            f.originalName === upload.originalName ? { ...f, status: "uploading" } : f
          ))
          
          try {
            await api.api.uploads({ id: upload.id }).start.patch()

            const xhr = new XMLHttpRequest()
            
            await new Promise<void>((resolve, reject) => {
              xhr.upload.addEventListener("progress", (event) => {
                if (event.lengthComputable) {
                  const progress = Math.round((event.loaded / event.total) * 100)
                  setFiles(prev => prev.map(f => 
                    f.originalName === upload.originalName ? { ...f, progress } : f
                  ))
                }
              })
              
              xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) resolve()
                else reject(new Error(`Upload failed`))
              })
              
              xhr.addEventListener("error", () => reject(new Error("Upload failed")))
              
              xhr.open("PUT", upload.uploadUrl)
              xhr.setRequestHeader("Content-Type", fileData.mimeType)
              xhr.send(fileData.file)
            })

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
          }
        })
      )
      
      toast.success("All files uploaded successfully!")
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
    if (!isAllUploaded) return

    try {
      const fileIds = files.map(f => f.id)
      const { data, error } = await api.api.profiling.post({
        jobTitle: jobTitle || undefined,
        jobDescription: jobDescription.trim(),
        fileIds,
      })

      if (error || !data || !data.session) {
        throw new Error("Failed to create profiling session")
      }

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

      <motion.section 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-6">
          <Card className="shadow-x border-none">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Job description</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Paste your job description or choose from existing templates to auto-fill fields.
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
                  className="min-h-[200px] resize-none"
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

          <Card className="border-dashed shadow-x">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Resume upload</CardTitle>
                <CardDescription className="text-sm mt-1">Drop resumes to add them to your profiling session.</CardDescription>
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
                  relative flex min-h-[220px] flex-col items-center justify-center gap-4 
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
                <Button size="sm" className="mt-2">
                  Browse files
                </Button>
              </motion.div>

              {files.length > 0 && (
                <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    {files.length} file{files.length !== 1 ? "s" : ""} selected for upload.
                  </p>
                  <p className="mt-2 text-xs">
                    Uploads will continue even if you leave this page. You&apos;ll be notified when all files are ready.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <div className="text-xs text-muted-foreground">
                Need help? <Link to="/support" className="underline">Check the upload guide</Link>
              </div>
              <Button 
                size="sm" 
                className="gap-2"
                disabled={!canSubmit || isUploading}
                onClick={startUpload}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    Continue to review
                    <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="h-full shadow-x border-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Upload queue</CardTitle>
              <CardDescription className="text-sm mt-1">Track your file uploads in real-time.</CardDescription>
            </div>
            {isUploading && (
              <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                <Loader2 className="size-3 animate-spin" /> Uploading
              </Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <FileText className="size-12 mb-3 opacity-20" />
                <p className="text-sm">No files added yet</p>
                <p className="text-xs mt-1">Drop files to get started</p>
              </div>
            ) : (
              files.map((file) => (
                <motion.div
                  key={file.id}
                  layout
                  className="rounded-lg border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-shadow"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-foreground">{file.originalName}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Badge
                      variant={file.status === "uploaded" ? "secondary" : file.status === "error" ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {file.status === "uploading" && "Uploading"}
                      {file.status === "uploaded" && "Complete"}
                      {file.status === "pending" && "Pending"}
                      {file.status === "error" && "Failed"}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1">
                    <Progress value={file.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{file.progress}%</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 border-t bg-muted/20 py-4">
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
              <span>Uploaded files</span>
              <span className="font-medium text-foreground">{uploadedCount} / {files.length}</span>
            </div>
            <Progress value={files.length > 0 ? (uploadedCount / files.length) * 100 : 0} className="h-2" />
            <Button 
              size="sm" 
              variant="secondary" 
              className="w-full gap-2"
              disabled={!isAllUploaded}
              onClick={handleLaunchProfiling}
            >
              Launch profiling
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      </motion.section>
    </div>
  )
}
