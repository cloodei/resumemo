import { Link } from "react-router-dom"
import { motion } from "motion/react"
import { cn } from "@/lib/utils"
import { useSession } from "@/lib/auth"
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
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Github, Mail, Sparkles, Clock, Briefcase, FileText } from "lucide-react"

const recentSessions = [
  {
    id: "prof-2f8a9c1d",
    name: "Senior Frontend Engineer - Q1 2026",
    jobTitle: "Senior Frontend Engineer",
    createdAt: "Jan 28, 2026",
    resumes: 48,
    status: "completed",
  },
  {
    id: "prof-9e3b7a2f",
    name: "Product Design Lead",
    jobTitle: "Product Designer",
    createdAt: "Jan 25, 2026",
    resumes: 32,
    status: "profiling",
  },
  {
    id: "prof-1c5d8e4b",
    name: "AI Research Team",
    jobTitle: "AI Research Scientist",
    createdAt: "Jan 22, 2026",
    resumes: 64,
    status: "completed",
  },
]

function detectAuthProvider(user: { image?: string | null; email?: string | null } | undefined) {
  if (!user) return "email"
  if (user.image?.includes("googleusercontent.com")) return "google"
  if (user.image?.includes("avatars.githubusercontent.com")) return "github"
  return "email"
}

function getProviderBadge(provider: string) {
  switch (provider) {
    case "google":
      return { label: "Google", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
    case "github":
      return { label: "GitHub", color: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20", icon: Github }
    default:
      return { label: "Email", color: "bg-primary/10 text-primary border-primary/20", icon: Mail }
  }
}

export default function Page() {
  const { data: session, isPending } = useSession()
  const user = session?.user
  const authProvider = detectAuthProvider(user)
  const providerBadge = getProviderBadge(authProvider)

  const metrics = [
    {
      label: "Active Sessions",
      value: "12",
      change: "+3.8% vs last week",
      icon: Briefcase,
    },
    {
      label: "Resumes Uploaded",
      value: "6,284",
      change: "+18.2%",
      icon: FileText,
    },
    {
      label: "Avg. Profiling Time",
      value: "4m 12s",
      change: "-1m 05s",
      icon: Clock,
    },
    {
      label: "AI Model",
      value: "Default v2.1",
      change: "Optimized for tech roles",
      icon: Sparkles,
    },
  ]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col gap-8">
        {/* User Welcome Section */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            {/* User Avatar & Info */}
            {user && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-4"
              >
                <Avatar className="size-16 border-2 border-primary/20 shadow-lg">
                  <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary font-semibold">
                    {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                      Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋
                    </h1>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{user.email}</span>
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] py-0 px-1.5 gap-1", providerBadge.color)}
                    >
                      {providerBadge.icon && <providerBadge.icon className="size-3" />}
                      {providerBadge.label}
                    </Badge>
                    {user.emailVerified && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                        ✓ Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
            {isPending && (
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-muted animate-pulse" />
                <div className="flex flex-col gap-2">
                  <div className="h-7 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </div>
              </div>
            )}
          </div>
          <p className="max-w-2xl text-balance text-sm text-muted-foreground">
            Monitor ranking activity, jump into active jobs, and keep talent pipelines moving with confidence.
          </p>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
              <Card 
                className="group relative overflow-hidden transition-all duration-300 shadow-x border-none hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-linear-to-br from-primary/2 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <CardHeader className="relative pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                      {metric.label}
                    </CardTitle>
                    <metric.icon className="size-4 text-muted-foreground/50" />
                  </div>
                  <CardDescription className="text-xs">{metric.change}</CardDescription>
                </CardHeader>
                <CardContent className="relative">
                  <p className="text-3xl font-bold tracking-tight text-foreground bg-linear-to-br from-foreground to-foreground/80 bg-clip-text">
                    {metric.value}
                  </p>
                </CardContent>
              </Card>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="h-full border-none shadow-md">
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/30 pb-4">
              <div>
                <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Recent Profiling Sessions</CardTitle>
                <CardDescription className="text-sm mt-1">Track AI analysis status and manage your resume profiling sessions.</CardDescription>
              </div>
              <Button
                asChild
                size="sm"
                className="relative shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.3)] hover:shadow-[inset_0_-1px_2px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.15)] dark:hover:shadow-[inset_0_-1px_2px_rgba(0,0,0,0.3),0_3px_6px_rgba(0,0,0,0.4)] transition-all before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-md before:bg-linear-to-b before:from-primary/5 before:to-primary/10 before:opacity-80 before:transition-opacity before:duration-300"
              >
                <Link to="/uploads">Upload Resumes</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead className="hidden sm:table-cell">Created</TableHead>
                    <TableHead className="hidden md:table-cell">Resumes</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {recentSessions.map((session) => (
                    <TableRow 
                      key={session.id} 
                      className="group cursor-pointer transition-all hover:bg-muted/50 dark:hover:bg-muted/20"
                    >
                      <TableCell className="font-semibold text-foreground">
                          <Link
                            to={`/profiling/${session.id}`}
                            className="hover:text-primary transition-colors hover:underline underline-offset-4 decoration-primary/30"
                          >
                           {session.id.slice(0, 12)}...
                          </Link>
                      </TableCell>
                      <TableCell className="font-medium group-hover:text-foreground transition-colors">{session.jobTitle}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {session.createdAt}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {session.resumes}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={session.status === "completed" ? "secondary" : session.status === "profiling" ? "default" : "outline"}
                          className="shadow-sm capitalize"
                        >
                          {session.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption>Profiling session updates refresh every 30 seconds.</TableCaption>
              </Table>
            </CardContent>
          </Card>

          <Card className="flex h-full flex-col border-none shadow-md">
            <CardHeader className="border-b border-border/30 pb-4">
              <CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Workflows</CardTitle>
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
    </motion.div>
  )
}
