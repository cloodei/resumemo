import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Download,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  Sparkles,
  UserRound,
  AlertCircle,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { toast } from "sonner"

type ProfilingSession = {
  id: string
  name: string | null
  jobTitle: string | null
  jobDescription: string
  status: "draft" | "ready" | "profiling" | "completed" | "failed"
  totalFiles: number
  processedFiles: number
  summary: unknown
  errorMessage: string | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
}

type SessionFile = {
  id: string
  originalName: string
  size: number
  score: number | null
  rank: number | null
  alignmentNotes: string | null
  parsedCandidateData: Record<string, unknown> | null
}

export default function ProfilingResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [session, setSession] = useState<ProfilingSession | null>(null)
  const [files, setFiles] = useState<SessionFile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isStarting, setIsStarting] = useState(false)

  useEffect(() => {
    if (id) {
      void fetchSession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchSession = async () => {
    try {
      const response = await fetch(`/api/profiling/${id}`, {
        credentials: "include",
      })

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Profiling session not found")
          navigate("/dashboard")
          return
        }
        throw new Error("Failed to fetch session")
      }

      const data = await response.json()
      setSession(data.session)
      setFiles(data.files)
    } catch (error) {
      toast.error("Failed to load profiling session")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const startProfiling = async () => {
    if (!id) return

    setIsStarting(true)
    try {
      const response = await fetch(`/api/profiling/${id}/start`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || "Failed to start profiling")
      }

      toast.success("Profiling started!")
      // Refresh to get updated status
      fetchSession()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start"
      toast.error(message)
    } finally {
      setIsStarting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="size-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading profiling session...</p>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const isReady = session.status === "ready" || session.status === "draft"
  const isProfiling = session.status === "profiling"
  const isCompleted = session.status === "completed"
  const isFailed = session.status === "failed"

  // Calculate progress for profiling state
  const progress = session.totalFiles > 0
    ? (session.processedFiles / session.totalFiles) * 100
    : 0

  // Sort files by score/rank for display
  const sortedFiles = [...files].sort((a, b) => {
    if (a.score === null && b.score === null) return 0
    if (a.score === null) return 1
    if (b.score === null) return -1
    return b.score - a.score
  })

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
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="size-4 mr-1" />
            Dashboard
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge 
            variant={isCompleted ? "default" : isProfiling ? "secondary" : isFailed ? "destructive" : "outline"}
            className="text-xs uppercase tracking-wider"
          >
            {session.status}
          </Badge>
          <p className="text-sm text-muted-foreground">Session {session.id.slice(0, 8)}</p>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="head-text-md text-foreground">
            {session.name || session.jobTitle || "Untitled Profiling Session"}
          </h1>
          <p className="text-sm text-muted-foreground max-w-3xl line-clamp-2">
            {session.jobDescription}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isCompleted && (
            <Button size="sm" className="gap-2">
              <Download className="size-4" />
              Export Results
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-2">
            <Mail className="size-4" />
            Share
          </Button>
          <Button size="sm" variant="ghost" className="gap-2">
            <ArrowUpRight className="size-4" />
            View Details
          </Button>
        </div>
      </motion.section>

      {/* Status-specific Content */}
      {isReady && (
        <motion.section
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="size-20 rounded-full bg-violet-500/10 flex items-center justify-center mb-6">
            <Sparkles className="size-10 text-violet-500" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Ready to Profile</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            {session.totalFiles} resume{session.totalFiles !== 1 ? "s" : ""} ready to be analyzed against your job description.
          </p>
          <Button 
            size="lg" 
            onClick={startProfiling}
            disabled={isStarting}
            className="gap-2"
          >
            {isStarting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Start AI Profiling
              </>
            )}
          </Button>
        </motion.section>
      )}

      {isProfiling && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="w-full max-w-md">
            <div className="size-20 rounded-full bg-sky-500/10 flex items-center justify-center mb-6 mx-auto">
              <Loader2 className="size-10 text-sky-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Profiling in Progress</h2>
            <p className="text-muted-foreground mb-8">
              AI is analyzing {session.totalFiles} resumes...
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-3" />
              <p className="text-xs text-muted-foreground">
                {session.processedFiles} of {session.totalFiles} files processed
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {isFailed && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="size-20 rounded-full bg-destructive/10 flex items-center justify-center mb-6">
            <AlertCircle className="size-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Profiling Failed</h2>
          <p className="text-muted-foreground max-w-md mb-2">
            Something went wrong during the profiling process.
          </p>
          {session.errorMessage && (
            <p className="text-sm text-destructive mb-6 max-w-md">
              {session.errorMessage}
            </p>
          )}
          <div className="flex gap-3">
            <Button onClick={startProfiling} disabled={isStarting} className="gap-2">
              {isStarting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate("/profiling/new")}>
              Create New Session
            </Button>
          </div>
        </motion.section>
      )}

      {isCompleted && (
        <>
          {/* Summary Stats */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]"
          >
            <Card className="h-full shadow-x border-none">
              <CardHeader className="flex flex-row items-center justify-between gap-6 border-b border-border/50 pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Profiling Summary</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    Overall results and key insights
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                  <BarChart3 className="size-3" /> Analytics
                </Badge>
              </CardHeader>
              <CardContent className="px-4 pt-6">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <SummaryTile 
                    label="Resumes Analyzed" 
                    value={session.totalFiles} 
                    subtext="Total processed"
                  />
                  <SummaryTile 
                    label="Top Matches" 
                    value={sortedFiles.filter(f => (f.score || 0) >= 80).length} 
                    subtext="Score 80+"
                  />
                  <SummaryTile 
                    label="Avg Score" 
                    value={`${Math.round(sortedFiles.reduce((acc, f) => acc + (f.score || 0), 0) / sortedFiles.length)}/100`} 
                    subtext="Match average"
                  />
                  <SummaryTile 
                    label="Processed" 
                    value={session.completedAt 
                      ? new Date(session.completedAt).toLocaleDateString() 
                      : "-"
                    } 
                    subtext="Completion date"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-x">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="text-lg font-semibold">Filters</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Refine results by score, skills, or other criteria
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="scores">
                  <TabsList>
                    <TabsTrigger value="scores" className="border-none cursor-pointer">Scores</TabsTrigger>
                    <TabsTrigger value="skills" className="border-none cursor-pointer">Skills</TabsTrigger>
                    <TabsTrigger value="experience" className="border-none cursor-pointer">Experience</TabsTrigger>
                  </TabsList>
                  <TabsContent value="scores" className="mt-4 text-sm text-muted-foreground">
                    <p>Filter candidates by match score threshold</p>
                    <div className="flex gap-2 mt-3">
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">90+</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">80-89</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">70-79</Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">&lt;70</Badge>
                    </div>
                  </TabsContent>
                  <TabsContent value="skills" className="mt-4 text-sm text-muted-foreground">
                    <p>Filter by specific skills mentioned in resumes</p>
                  </TabsContent>
                  <TabsContent value="experience" className="mt-4 text-sm text-muted-foreground">
                    <p>Filter by years of experience</p>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </motion.section>

          {/* Ranked Results Table */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="shadow-m border-border/60">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 border-b border-border/50 pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Ranked Candidates</CardTitle>
                  <CardDescription className="text-sm mt-1">
                    AI-ranked based on job description match
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="size-3" />
                  <span>AI Scored</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Rank</TableHead>
                      <TableHead>Candidate</TableHead>
                      <TableHead className="hidden sm:table-cell">File</TableHead>
                      <TableHead className="w-32">Score</TableHead>
                      <TableHead className="hidden md:table-cell">Alignment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedFiles.map((file, index) => (
                      <TableRow
                        key={file.id}
                        className="group align-top transition-all hover:bg-muted/55 cursor-pointer"
                      >
                        <TableCell>
                          <Badge 
                            variant={index < 3 ? "default" : "secondary"} 
                            className="text-xs"
                          >
                            #{index + 1}
                          </Badge>
                        </TableCell>
                        <TableCell className="space-y-1">
                          <div className="flex items-center gap-2">
                            <UserRound className="size-4 text-muted-foreground" />
                            <span className="font-semibold text-foreground">
                              Candidate {index + 1}
                            </span>
                          </div>

                          {/*
                            COME BACK TO THIS ONE
                          */}
                          {file.parsedCandidateData?.name ? (
                            <p className="text-xs text-muted-foreground">
                              {"" + file.parsedCandidateData.name}
                            </p>
                          ) : null}


                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="size-4" />
                            <span className="truncate max-w-[200px]">{file.originalName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`
                              size-2 rounded-full
                              ${(file.score || 0) >= 80 ? "bg-emerald-500" : 
                                (file.score || 0) >= 60 ? "bg-amber-500" : "bg-red-500"}
                            `} />
                            <span className="font-medium">{file.score || 0}/100</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <p className="line-clamp-2">{file.alignmentNotes || "No specific notes"}</p>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 py-4 text-xs text-muted-foreground">
                <span>Export full results or sync to your ATS</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary">
                    <Download className="size-4 mr-2" />
                    Download CSV
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </motion.section>
        </>
      )}
    </div>
  )
}

function SummaryTile({ label, value, subtext }: {
  label: string
  value: string | number
  subtext: string
}) {
  return (
    <div className="rounded-xl border-none shadow-m bg-muted/55 py-4 pl-3 pr-5 transition-all hover:-translate-y-0.5 grid">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold text-foreground bg-linear-to-br from-foreground to-foreground/80 bg-clip-text">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}
