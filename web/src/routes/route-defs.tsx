import LandingPage from "@/pages/landing-page"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import NewProfilingPage from "@/pages/profiling/new"
import ProfilingResultsPage from "@/pages/profiling/session"
import RandomTestPage from "@/pages/test/random"
import NewJobPage from "@/pages/jobs/new-job"
import JobResultsPage from "@/pages/jobs/job-results"

export const ROUTES = [
  {
    path: "/",
    title: "Résumé Ranker",
    element: <LandingPage />,
    layout: "none",
  },
  {
    path: "/login",
    title: "Sign In · Résumé Ranker",
    element: <LoginPage />,
    layout: "none",
  },
  {
    path: "/dashboard",
    title: "Dashboard · Résumé Ranker",
    element: <DashboardPage />,
    layout: "app",
  },
  {
    path: "/profiling/new",
    title: "New Profiling Session · Résumé Ranker",
    element: <NewProfilingPage />,
    layout: "app",
  },
  {
    path: "/profiling/:id",
    title: "Profiling Results · Résumé Ranker",
    element: <ProfilingResultsPage />,
    layout: "app",
  },
  {
    path: "/test/random",
    title: "Random API Test · Résumé Ranker",
    element: <RandomTestPage />,
    layout: "app",
  },
  // Legacy redirects (can remove later)
  {
    path: "/jobs/new",
    title: "Upload Resumes · Résumé Ranker",
    element: <NewJobPage />,
    layout: "app",
  },
  {
    path: "/jobs/:id",
    title: "Profiling Results · Résumé Ranker",
    element: <JobResultsPage />,
    layout: "app",
  },
  {
    path: "/app",
    title: "Dashboard · Résumé Ranker",
    element: <DashboardPage />,
    layout: "app",
  },
] as const

export type Routes = typeof ROUTES[number]["path"]
