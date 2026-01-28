import { Navigate, Route, Routes } from "react-router-dom"
import LandingPage from "@/pages/page"
import AppLayout from "@/pages/app/layout"
import AppIndexRedirect from "@/pages/app/index"
import DashboardPage from "@/pages/app/dashboard/page"
import NewJobPage from "@/pages/app/jobs/new/page"
import JobResultsPage from "@/pages/app/jobs/[id]/page"
import LoginPage from "@/pages/login/page"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/app"
        element={
          <AppLayout>
            <AppIndexRedirect />
          </AppLayout>
        }
      />
      <Route
        path="/dashboard"
        element={
          <AppLayout>
            <DashboardPage />
          </AppLayout>
        }
      />
      <Route
        path="/jobs/new"
        element={
          <AppLayout>
            <NewJobPage />
          </AppLayout>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <AppLayout>
            <JobResultsPage />
          </AppLayout>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
