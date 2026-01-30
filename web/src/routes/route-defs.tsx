import LandingPage from "@/pages/landing-page"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
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
    path: "/jobs/new",
    title: "New Job · Résumé Ranker",
    element: <NewJobPage />,
    layout: "app",
  },
  {
    path: "/jobs/:id",
    title: "Job Results · Résumé Ranker",
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
