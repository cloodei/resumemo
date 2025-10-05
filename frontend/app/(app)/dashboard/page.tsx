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
import Link from "next/link"
import { cn } from "@/lib/utils"

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
            <Card key={metric.label} className="card-hover">
              <CardHeader>
                <CardTitle className="text-base text-muted-foreground">
                  {metric.label}
                </CardTitle>
                <CardDescription>{metric.change}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight text-foreground">
                  {metric.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Recent ranking jobs</CardTitle>
              <CardDescription>Track status and jump back into jobs that need attention.</CardDescription>
            </div>
            <Link
              href="/jobs/new"
              className={cn(
                buttonVariants({ size: "sm" }),
                "before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-gradient-to-b before:opacity-80 before:transition-opacity before:duration-300 before:ease-[cubic-bezier(0.4,0.36,0,1)] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:rounded-md after:bg-gradient-to-b after:to-transparent after:mix-blend-overlay"
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
                  <TableRow key={job.id} className="cursor-pointer">
                    <TableCell className="font-medium text-foreground">
                      <Link href={`/jobs/${job.id}`} className="hover:underline">
                        {job.id}
                      </Link>
                    </TableCell>
                    <TableCell>{job.role}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {job.createdAt}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {job.resumes}
                    </TableCell>
                    <TableCell>
                      <Badge variant={job.status === "Completed" ? "secondary" : "outline"}>
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

        <Card className="flex h-full flex-col">
          <CardHeader>
            <CardTitle className="text-lg">Workflows</CardTitle>
            <CardDescription>Select a view to explore automation and insights.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <Tabs defaultValue="pipelines" className="flex-1">
              <TabsList>
                <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
                <TabsTrigger value="models">Scoring models</TabsTrigger>
              </TabsList>
              <TabsContent value="pipelines" className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="font-medium text-foreground">Tech GTM</p>
                  <p className="mt-1 text-sm">Automated screening for senior engineers meeting GTM hiring goals.</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="font-medium text-foreground">Product Ops Accelerator</p>
                  <p className="mt-1 text-sm">30 resumes processed this week. 78% meet the minimum scoring threshold.</p>
                </div>
              </TabsContent>
              <TabsContent value="models" className="mt-4 space-y-4 text-sm text-muted-foreground">
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="font-medium text-foreground">Default similarity model</p>
                  <p className="mt-1 text-sm">Optimized for balanced technical and leadership experience.</p>
                </div>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <p className="font-medium text-foreground">Experiment: AI/ML focus</p>
                  <p className="mt-1 text-sm">Higher weight on publications, model deployment, and prompt design.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
