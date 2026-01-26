"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

import { useAuth } from "@/components/auth-provider"

type LoginGuardProps = {
	children: React.ReactNode
}

export function LoginGuard({ children }: LoginGuardProps) {
	const { isAuthenticated, isLoading } = useAuth()
	const router = useRouter()

	useEffect(() => {
		if (!isLoading && isAuthenticated)
			router.replace("/dashboard")
	}, [isLoading, isAuthenticated, router])

	if (isLoading || isAuthenticated) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-4">
					<div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<p className="text-sm text-muted-foreground">Checking your session...</p>
				</div>
			</div>
		)
	}

	return <>{children}</>
}
