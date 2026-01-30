import { Navigate, Route, Routes } from "react-router-dom"

import { RouteTitle } from "./routes/route-title"
import { ROUTES } from "./routes/route-defs"
import AppLayout from "./layouts/app-layout"

export function App() {
  return (
    <Routes>
      {ROUTES.map((route) => {
        const content = (
          <>
            <RouteTitle title={route.title} />
            {route.element}
          </>
        )

        return (
          <Route
            key={route.path}
            path={route.path}
            element={route.layout === "app" ? <AppLayout>{content}</AppLayout> : content}
          />
        )
      })}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
