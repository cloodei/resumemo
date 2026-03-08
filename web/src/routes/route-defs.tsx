import LandingPage from "@/pages/landing-page"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import NotFoundPage from "@/pages/not-found"
import NewProfilingPage from "@/pages/profiling/new"
import ProfilingResultsPage from "@/pages/profiling/session"
import ProfilingSessionsPage from "@/pages/profiling/list"

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
    path: "/profiling",
    title: "Profiling Sessions · Résumé Ranker",
    element: <ProfilingSessionsPage />,
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
    path: "/app",
    title: "Dashboard · Résumé Ranker",
    element: <DashboardPage />,
    layout: "app",
  },
  {
    path: "/not-found",
    title: "Not Found · Résumé Ranker",
    element: <NotFoundPage />,
    layout: "app",
  },
] as const

export type Routes = typeof ROUTES[number]["path"]
