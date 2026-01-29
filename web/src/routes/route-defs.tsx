import type { ReactNode } from "react"

import AppLayout from "@/layouts/app-layout"
import LandingPage from "@/pages/landing-page"
import LoginPage from "@/pages/login"
import DashboardPage from "@/pages/dashboard"
import NewJobPage from "@/pages/jobs/new-job"
import JobResultsPage from "@/pages/jobs/job-results"

export type RouteDefinition = {
  path: string
  title: string
  element: ReactNode
  layout?: "app" | "none"
}

export const ROUTES: RouteDefinition[] = [
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
]

export { AppLayout }
