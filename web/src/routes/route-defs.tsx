import LandingPage from "@/pages/landing-page"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import UploadPage from "@/pages/uploads"
import NewProfilingPage from "@/pages/profiling/new"
import ProfilingResultsPage from "@/pages/profiling/session"

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
    path: "/uploads",
    title: "Upload Resumes · Résumé Ranker",
    element: <UploadPage />,
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
  // Legacy redirects (can remove later)
  // {
  //   path: "/jobs/new",
  //   title: "Upload Resumes · Résumé Ranker",
  //   element: <UploadPage />,
  //   layout: "app",
  // },
  // {
  //   path: "/jobs/:id",
  //   title: "Profiling Results · Résumé Ranker",
  //   element: <ProfilingResultsPage />,
  //   layout: "app",
  // },
  {
    path: "/app",
    title: "Dashboard · Résumé Ranker",
    element: <DashboardPage />,
    layout: "app",
  },
] as const
