import { useNavigate } from "react-router-dom"
import { useEffect, useRef } from "react"

import { useAuth } from "@/components/auth/auth-provider"

export function LoginGuard(props: { children: React.ReactNode }) {
	const { isAuthenticated, isLoading } = useAuth()
	const navigate = useNavigate()
	const hasResolvedOnce = useRef(false)

	useEffect(() => {
		if (!isLoading && isAuthenticated)
			navigate("/dashboard", { replace: true })
	}, [isLoading, isAuthenticated])

  if (!isLoading && !hasResolvedOnce.current)
    hasResolvedOnce.current = true

  const showInitialLoader = isLoading && !hasResolvedOnce.current
  if (showInitialLoader) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Checking your session...</p>
        </div>
      </div>
    )
  }

	return <>{props.children}</>
}
