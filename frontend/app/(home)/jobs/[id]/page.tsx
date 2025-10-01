import {
  ArrowUpRight,
  BarChart3,
  Download,
  Filter,
  Mail,
  MapPin,
  ThumbsUp,
  UserRound,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"

const job = {
  id: "JOB-2409",
  role: "Senior Frontend Engineer",
  location: "Remote, North America",
  status: "COMPLETED",
  completedAt: "Sep 12, 2025 14:12 UTC",
  summary: {
    resumes: 48,
    shortlisted: 8,
    avgScore: 87,
    turnaround: "4m 08s",
  },
  highlights: [
    "Strong alignment with React, TypeScript, and accessibility experience.",
    "8 candidates exceed the threshold with leadership signals.",
    "3 candidates flagged for interview-ready status based on project depth.",
  ],
}

const candidates = [
  {
    rank: 1,
    name: "Laura Chen",
    score: 94,
    alignment: "Design systems, accessibility, React 18",
    location: "San Francisco, CA",
    email: "laura.chen@example.com",
  },
  {
    rank: 2,
    name: "Daniel Rivera",
    score: 91,
    alignment: "Performance optimization, TypeScript, mentorship",
    location: "Seattle, WA",
    email: "daniel.r@example.com",
  },
  {
    rank: 3,
    name: "Priya Patel",
    score: 89,
    alignment: "AI integrations, cross-functional leadership",
    location: "Toronto, CA",
    email: "priya.patel@example.com",
  },
]

export default async function JobResultsPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="text-xs uppercase tracking-widest text-primary">
            Completed
          </Badge>
          <p className="text-sm text-muted-foreground">Finished {job.completedAt}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h1 className="head-text-md text-foreground">{job.role}</h1>
          <p className="text-sm text-muted-foreground">
            Job ID {job.id} • {job.location}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" className="gap-2">
            Export results
            <Download className="size-4" />
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            Share
definition
            <Mail className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" className="gap-2">
            View job details
            <ArrowUpRight className="size-4" />
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between gap-6">
            <div>
              <CardTitle className="text-lg">Ranking summary</CardTitle>
              <CardDescription>Overall health of this job run and key status indicators.</CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <BarChart3 className="size-3" /> View analytics
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryTile label="Resumes processed" value={job.summary.resumes} subtext="Across all sources" />
              <SummaryTile label="Shortlisted" value={job.summary.shortlisted} subtext="Above threshold" />
              <SummaryTile label="Average score" value={`${job.summary.avgScore}/100`} subtext="Top 20% candidates" />
              <SummaryTile label="Turnaround" value={job.summary.turnaround} subtext="From upload to ranking" />
            </div>
            <div className="mt-6 space-y-3 text-sm text-muted-foreground">
              {job.highlights.map((highlight) => (
                <div key={highlight} className="flex items-start gap-3">
                  <ThumbsUp className="size-4 text-primary" />
                  <p>{highlight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>Adjust scoring thresholds, locations, and tags to refine results.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="scores">
              <TabsList>
                <TabsTrigger value="scores">Scores</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="tags">Tags</TabsTrigger>
              </TabsList>
              <TabsContent value="scores" className="mt-4 space-y-3 text-sm text-muted-foreground">
                <p>Focus on candidates above a certain match score to build your shortlist.</p>
                <Button size="sm" variant="outline" className="gap-2 self-start">
                  <Filter className="size-4" /> Configure threshold
                </Button>
              </TabsContent>
              <TabsContent value="location" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Highlight candidates in target regions to coordinate interview loops faster.</p>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4" />
                  <span>North America priority with EMEA fallback</span>
                </div>
              </TabsContent>
              <TabsContent value="tags" className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p>Toggle AI, design systems, or leadership focus to reprioritize the ranked stack.</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">AI/LLM</Badge>
                  <Badge variant="outline">Design systems</Badge>
                  <Badge variant="outline">Mentorship</Badge>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Ranked candidates</CardTitle>
              <CardDescription>Sort and filter to build interview-ready slates.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Scoring model: Default similarity</span>
              <Badge variant="outline">Confidence: High</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Candidate</TableHead>
                  <TableHead className="hidden sm:table-cell">Alignment highlights</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="hidden md:table-cell">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {candidates.map((candidate) => (
                  <TableRow key={candidate.rank} className="align-top">
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        #{candidate.rank}
                      </Badge>
                    </TableCell>
                    <TableCell className="space-y-1">
                      <p className="font-semibold text-foreground">{candidate.name}</p>
                      <p className="text-xs text-muted-foreground">Score {candidate.score}/100</p>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {candidate.alignment}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserRound className="size-3.5" />
                        {candidate.location}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1">
                          <Mail className="size-3.5" />
                          Reach out
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1">
                          <ArrowUpRight className="size-3.5" />
                          Profile
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 py-4 text-xs text-muted-foreground">
            <span>Export full CSV or sync shortlist to ATS.</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary">
                Download CSV
              </Button>
              <Button size="sm" variant="ghost">
                Sync to ATS
              </Button>
            </div>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Candidate spotlight</CardTitle>
            <CardDescription>Dig into resume insights for top candidates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">Laura Chen</p>
              <p className="mt-1 text-xs">Score 94/100 • 6 years experience</p>
              <ul className="mt-3 space-y-2">
                <li>• Led design system implementation impacting 30+ teams.</li>
                <li>• Drove accessibility improvements achieving AA compliance.</li>
                <li>• Built progressive enhancement strategy for LCP &lt; 2s.</li>
              </ul>
              <Button size="sm" variant="ghost" className="mt-4 gap-2">
                View resume
                <ArrowUpRight className="size-4" />
              </Button>
            </div>
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-semibold text-foreground">Priya Patel</p>
              <p className="mt-1 text-xs">Score 89/100 • 8 years experience</p>
              <ul className="mt-3 space-y-2">
                <li>• Scaled AI-powered experimentation platform for marketing funnels.</li>
                <li>• Mentored cross-functional pods to ship 4 major launches.</li>
                <li>• Deployed pipeline for automated prompt testing with monitoring.</li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="border-t bg-muted/20 py-4">
            <Button size="sm" variant="secondary" className="w-full gap-2">
              Compare candidates
              <ArrowUpRight className="size-4" />
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  )
}

function SummaryTile({ label, value, subtext }: {
  label: string
  value: string | number
  subtext: string
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
    </div>
  )
}
