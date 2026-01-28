import { Navigate } from "react-router-dom"

export default function AppIndexRedirect() {
  return <Navigate to="/dashboard" replace />
}
