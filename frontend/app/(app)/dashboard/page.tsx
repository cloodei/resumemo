import Link from "next/link"

import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

const recentJobs = [
  {
    id: "JOB-2409",
    role: "Senior Frontend Engineer",
    createdAt: "Sep 12, 2025",
    resumes: 48,
    status: "Completed",
  },
  {
    id: "JOB-2408",
    role: "Product Designer",
    createdAt: "Sep 10, 2025",
    resumes: 32,
    status: "Processing",
  },
  {
    id: "JOB-2407",
    role: "AI Research Scientist",
    createdAt: "Sep 08, 2025",
    resumes: 64,
    status: "Completed",
  },
]

const metrics = [
  {
    label: "Active Jobs",
    value: "12",
    change: "+3.8% vs last week",
  },
  {
    label: "Resumes Processed",
    value: "6,284",
    change: "+18.2%",
  },
  {
    label: "Avg. Turnaround",
    value: "4m 12s",
    change: "-1m 05s",
  },
  {
    label: "Top JD Template",
    value: "Full-Stack SWE",
    change: "Using default scoring model",
  },
]

export default function Page() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Real-time insights
          </p>
          <h1 className="head-text-md gradient-text">Welcome back, recruiter 👋</h1>
          <p className="max-w-2xl text-balance text-sm text-muted-foreground">
            Monitor ranking activity, jump into active jobs, and keep talent pipelines moving with confidence.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <Card 
              key={metric.label} 
              className="group relative overflow-hidden transition-all duration-300 shadow-x border-none hover:-translate-y-1"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <CardHeader className="relative">
                <CardTitle className="text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  {metric.label}
                </CardTitle>
                <CardDescription className="text-xs">{metric.change}</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <p className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-br from-foreground to-foreground/80 bg-clip-text">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="h-full border-none shadow-md">
          <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/30 pb-4">
            <div>
              <CardTitle className="text-lg font-semibold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">Recent ranking jobs</CardTitle>
              <CardDescription className="text-sm mt-1">Track status and jump back into jobs that need attention.</CardDescription>
            </div>
            <Link
              href="/jobs/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "relative shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.15)] dark:hover:shadow-[inset_0_-1px_2px_rgba(0,0,0,0.3),0_3px_6px_rgba(0,0,0,0.4)] transition-all before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-gradient-to-b before:from-primary/5 before:to-primary/10 before:opacity-80 before:transition-opacity before:duration-300"
              )}
            >
              New job
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job ID</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="hidden sm:table-cell">Created</TableHead>
                  <TableHead className="hidden md:table-cell">Resumes</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {recentJobs.map((job) => (
                  <TableRow 
                    key={job.id} 
                    className="group cursor-pointer transition-all hover:bg-muted/50 dark:hover:bg-muted/20"
                  >
                    <TableCell className="font-semibold text-foreground">
                      <Link 
                        href={`/jobs/${job.id}`} 
                        className="hover:text-primary transition-colors hover:underline underline-offset-4 decoration-primary/30"
                      >
                        {job.id}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium group-hover:text-foreground transition-colors">{job.role}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {job.createdAt}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {job.resumes}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={job.status === "Completed" ? "secondary" : "outline"}
                        className="shadow-sm"
                      >
                        {job.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>Résumé processing updates refresh every 30 seconds.</TableCaption>
            </Table>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col border-none shadow-md">
          <CardHeader className="border-b border-border/30 pb-4">
            <CardTitle className="text-lg font-semibold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text">Workflows</CardTitle>
            <CardDescription className="text-sm mt-1">Select a view to explore automation and insights.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col pt-6">
            <Tabs defaultValue="pipelines" className="flex-1">
              <TabsList>
                <TabsTrigger value="pipelines" className="border-none">Pipelines</TabsTrigger>
                <TabsTrigger value="models" className="border-none">Scoring models</TabsTrigger>
              </TabsList>
              <TabsContent value="pipelines" className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="group rounded-lg bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:shadow-l hover:bg-muted/40 dark:hover:bg-muted/30 hover:-translate-y-0.5 cursor-pointer">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Tech GTM</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Automated screening for senior engineers meeting GTM hiring goals.</p>
                </div>
                <div className="group rounded-lg bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:shadow-l hover:bg-muted/40 dark:hover:bg-muted/30 hover:-translate-y-0.5 cursor-pointer">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Product Ops Accelerator</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">30 resumes processed this week. 78% meet the minimum scoring threshold.</p>
                </div>
              </TabsContent>
              <TabsContent value="models" className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="group rounded-lg bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:shadow-l hover:bg-muted/40 dark:hover:bg-muted/30 hover:-translate-y-0.5 cursor-pointer">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Default similarity model</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Optimized for balanced technical and leadership experience.</p>
                </div>
                <div className="group rounded-lg bg-muted/30 dark:bg-muted/20 p-4 shadow-m transition-all hover:shadow-l hover:bg-muted/40 dark:hover:bg-muted/30 hover:-translate-y-0.5 cursor-pointer">
                  <p className="font-semibold text-foreground group-hover:text-primary transition-colors">Experiment: AI/ML focus</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">Higher weight on publications, model deployment, and prompt design.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
