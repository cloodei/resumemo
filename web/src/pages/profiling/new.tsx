"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Sparkles,
  Loader2,
  ChevronLeft,
  Briefcase,
  AlertCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

type UploadedFile = {
  id: string
  originalName: string
  size: number
  status: string
  createdAt: string
}

export default function NewProfilingPage() {
  const navigate = useNavigate()
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [jobTitle, setJobTitle] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [sessionName, setSessionName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)

  useEffect(() => {
    fetchFiles()
  }, [])

  const fetchFiles = async () => {
    try {
      const response = await fetch("/api/uploads", {
        credentials: "include",
      })
      
      if (!response.ok) throw new Error("Failed to fetch files")
      
      const data = await response.json()
      // Only show uploaded files
      const uploadedFiles = data.files.filter((f: UploadedFile) => f.status === "uploaded")
      setFiles(uploadedFiles)
    } catch (error) {
      toast.error("Failed to load uploaded files")
      console.error(error)
    } finally {
      setIsFetching(false)
    }
  }

  const toggleFile = (fileId: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fileId)) {
        newSet.delete(fileId)
      } else {
        newSet.add(fileId)
      }
      return newSet
    })
  }

  const toggleAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const canSubmit = selectedFiles.size > 0 && jobDescription.trim().length >= 50

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (selectedFiles.size === 0) {
        toast.error("Select at least one resume file")
      } else {
        toast.error("Job description must be at least 50 characters")
      }
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/profiling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: sessionName || undefined,
          jobTitle: jobTitle || undefined,
          jobDescription: jobDescription.trim(),
          fileIds: Array.from(selectedFiles),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to create profiling session")
      }

      const data = await response.json()
      
      toast.success("Profiling session created!")
      
      // Navigate to the session page
      navigate(`/profiling/${data.session.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create session"
      toast.error(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate("/uploads")}>
            <ChevronLeft className="size-4 mr-1" />
            Back to Uploads
          </Button>
        </div>
        
        <div className="flex flex-col gap-2">
          <Badge className="w-fit bg-linear-to-br from-violet-500/80 to-pink-500/90 text-neutral-100">
            <Sparkles className="size-3 mr-1" />
            AI Profiling
          </Badge>
          <h1 className="head-text-md text-foreground">Create Profiling Session</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Select the resumes you want to analyze and provide a job description. 
            Our AI will score each candidate based on their fit for the role.
          </p>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]"
      >
        {/* Job Description Section */}
        <div className="flex flex-col gap-6">
          <Card className="shadow-x border-none">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
                  <Briefcase className="size-4 text-violet-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Job Details</CardTitle>
                  <CardDescription className="text-sm">
                    Describe the role you&apos;re hiring for
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-2">
                <Label htmlFor="session-name">Session Name (Optional)</Label>
                <Input
                  id="session-name"
                  placeholder="e.g., Senior Frontend Engineer - Q1 2026"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Helps you identify this profiling session later
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="job-title">Job Title (Optional)</Label>
                <Input
                  id="job-title"
                  placeholder="e.g., Senior Frontend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="job-description">
                    Job Description <span className="text-destructive">*</span>
                  </Label>
                  <span className={`text-xs ${jobDescription.length < 50 ? "text-destructive" : "text-emerald-500"}`}>
                    {jobDescription.length} / 50 min
                  </span>
                </div>
                <Textarea
                  id="job-description"
                  placeholder="Describe the role, responsibilities, required skills, and experience level. Be specific about must-have vs nice-to-have qualifications..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[240px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 50 characters. More detail helps the AI provide better scoring.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Validation Alert */}
          {!canSubmit && (selectedFiles.size > 0 || jobDescription.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4"
            >
              <AlertCircle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-700">Before you can start profiling:</p>
                <ul className="mt-1 space-y-1 text-amber-600">
                  {selectedFiles.size === 0 && <li>Select at least one resume file</li>}
                  {jobDescription.length < 50 && <li>Write a job description (min 50 characters)</li>}
                </ul>
              </div>
            </motion.div>
          )}

          {/* Ready State */}
          {canSubmit && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4"
            >
              <CheckCircle2 className="size-5 text-emerald-500 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-emerald-700">Ready to profile!</p>
                <p className="text-emerald-600">
                  {selectedFiles.size} resume{selectedFiles.size !== 1 ? "s" : ""} selected
                </p>
              </div>
            </motion.div>
          )}
        </div>

        {/* File Selection Section */}
        <Card className="h-full flex flex-col shadow-x border-none">
          <CardHeader className="flex-shrink-0 border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
                  <FileText className="size-4 text-sky-500" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Select Resumes</CardTitle>
                  <CardDescription className="text-sm">
                    {selectedFiles.size} of {files.length} selected
                  </CardDescription>
                </div>
              </div>
              
              {files.length > 0 && (
                <Button variant="ghost" size="sm" onClick={toggleAll}>
                  {selectedFiles.size === files.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-y-auto p-4">
            {isFetching ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Loader2 className="size-8 animate-spin mb-3" />
                <p className="text-sm">Loading your files...</p>
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileText className="size-12 mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">No uploaded files found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Upload some resumes first
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate("/uploads")}
                >
                  Go to Uploads
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer
                      transition-all duration-150
                      ${selectedFiles.has(file.id) 
                        ? "border-primary bg-primary/5" 
                        : "border-transparent bg-muted/30 hover:bg-muted/50"
                      }
                    `}
                    onClick={() => toggleFile(file.id)}
                  >
                    <Checkbox
                      checked={selectedFiles.has(file.id)}
                      onCheckedChange={() => toggleFile(file.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-shrink-0 size-10 rounded-lg bg-sky-500/10 flex items-center justify-center">
                      <FileText className="size-4 text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    {selectedFiles.has(file.id) && (
                      <CheckCircle2 className="size-4 text-primary flex-shrink-0" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex-shrink-0 flex-col gap-3 border-t bg-muted/20 py-4">
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
              <span>Selection</span>
              <span className="font-medium text-foreground">
                {selectedFiles.size} / {files.length}
              </span>
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || isLoading}
              className="w-full gap-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Creating Session...
                </>
              ) : (
                <>
                  <Sparkles className="size-4" />
                  Start Profiling
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground">
              AI will analyze {selectedFiles.size} resume{selectedFiles.size !== 1 ? "s" : ""} against your job description
            </p>
          </CardFooter>
        </Card>
      </motion.section>
    </div>
  )
}
