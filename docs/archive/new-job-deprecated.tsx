import { Link } from "react-router-dom"
import { motion } from "motion/react"
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

const steps = [
  {
    id: 1,
    title: "Create job",
    description: "Provide a JD or select a template.",
  },
  {
    id: 2,
    title: "Upload resumes",
    description: "Drag & drop PDF, DOCX, or TXT files.",
  },
  {
    id: 3,
    title: "Review & launch",
    description: "Confirm details and start ranking.",
  },
]

const mockQueue = [
  {
    name: "Laura Chen.pdf",
    size: "1.6 MB",
    progress: 82,
    status: "UPLOADING",
  },
  {
    name: "Daniel Rivera.pdf",
    size: "2.1 MB",
    progress: 100,
    status: "CONFIRMED",
  },
  {
    name: "Priya Patel.pdf",
    size: "1.4 MB",
    progress: 0,
    status: "PENDING",
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

export default function NewJobPage() {
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
            Orchestrate a new ranking job
          </Badge>
          <h1 className="head-text-md text-foreground">Upload, orchestrate, and launch</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Set up your job description, add candidate resumes, and keep track of the S3 upload pipeline with live feedback before ranking begins.
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
                  Paste your JD or choose from existing templates to auto-fill fields.
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                className="shadow-m hover:shadow-l transition-all"
              >
                Import from JD library
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <label className="text-sm font-medium text-foreground" htmlFor="job-title">
                  Job title
                </label>
                <Input id="job-title" placeholder="e.g. Staff Product Designer" className="h-11" />
              </div>
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground" htmlFor="job-description">
                    Job description detail
                  </label>
                  <span className="text-xs text-muted-foreground">Min 50 characters</span>
                </div>
                <Textarea
                  id="job-description"
                  placeholder="Describe responsibilities, skills, and must-have experience..."
                  className="min-h-[200px] resize-none"
                />
              </div>
              <Tabs defaultValue="templates" className="pt-2">
                <TabsList>
                  <TabsTrigger className="border-none cursor-pointer" value="templates">Templates</TabsTrigger>
                  <TabsTrigger className="border-none cursor-pointer" value="history">Recent jobs</TabsTrigger>
                </TabsList>
                <TabsContent value="templates" className="mt-4 grid gap-3 md:grid-cols-2">
                  {jdTemplates.map((template) => (
                    <div
                      key={template.title}
                      className="group rounded-lg border border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:border-primary/50 hover:bg-primary/5 hover:shadow-l hover:-translate-y-0.5 cursor-pointer"
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
                  <p>Recently launched jobs will appear here to quickly duplicate configurations.</p>
                  <Button size="sm" variant="outline" className="h-9 px-3">
                    View job history
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="border-dashed shadow-x">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/30 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Resume upload</CardTitle>
                <CardDescription className="text-sm mt-1">Drop resumes to request S3 URLs and start uploading.</CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <UploadCloud className="size-3.5" /> Direct S3
              </Badge>
            </CardHeader>
            <CardContent className="space-y-6">
              <motion.div
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.995 }}
                className="border-muted-foreground/40 focus-ring relative flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <UploadCloud className="size-6" />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                    Drag & drop resumes or click to browse
                  </p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, TXT up to 5MB each</p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="size-3" /> Batch up to 50 files
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3" /> Metadata auto-detected
                  </span>
                </div>
                <Button size="sm" className="mt-2">
                  Browse files
                </Button>
              </motion.div>

                <div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
                  <p className="flex items-center gap-2 text-foreground">
                    <CheckCircle2 className="size-4 text-emerald-500" />
                    Pre-signed URLs fetched for 3 of 10 files.
                  </p>
                  <p className="mt-2 text-xs">
                    Uploads continue even if you leave this page. You&apos;ll receive a notification when all files are confirmed by the API.
                  </p>
                </div>
            </CardContent>
            <CardFooter className="justify-between">
              <div className="text-xs text-muted-foreground">
                Need help? <Link to="/support" className="underline">Check the upload guide</Link>
              </div>
              <Button size="sm" className="gap-2">
                Continue to review
                <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="h-full shadow-x border-none">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 dark:border-border/30 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Upload queue</CardTitle>
              <CardDescription className="text-sm mt-1">Track local progress vs API confirmations.</CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Loader2 className="size-3 animate-spin" /> Polling 3s
            </Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            {mockQueue.map((file) => (
              <motion.div
                key={file.name}
                layout
                className="rounded-lg border-none bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-shadow"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.size}</p>
                  </div>
                  <Badge
                    variant={file.status === "CONFIRMED" ? "secondary" : "outline"}
                    className="text-xs"
                  >
                    {file.status === "UPLOADING" && "Uploading"}
                    {file.status === "CONFIRMED" && "Confirmed"}
                    {file.status === "PENDING" && "Pending"}
                  </Badge>
                </div>
                <div className="mt-3 space-y-1">
                  <Progress value={file.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Client transfer</span>
                    <span>{file.progress}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
          <CardFooter className="flex flex-col items-start gap-3 border-t bg-muted/20 py-4">
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
              <span>Confirmed files</span>
              <span className="font-medium text-foreground">5 / 12</span>
            </div>
            <Progress value={42} className="h-2" />
            <Button size="sm" variant="secondary" className="w-full gap-2">
              Launch ranking
              <ArrowRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      </motion.section>
    </div>
  )
}
