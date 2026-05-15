import type { ReactNode } from "react"
import { useEffect, useState } from "react"

import { authClient, useSession } from "@/lib/auth"
import { AuthContext } from "@/components/auth/auth-context"

type AuthProviderProps = {
	children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
	const { data: sessionData, isPending, refetch } = useSession()
	const [isSigningOut, setIsSigningOut] = useState(false)

	const user = sessionData?.user ?? null
	const session = sessionData?.session ?? null
	const isLoading = isPending || isSigningOut
	const isAuthenticated = !!user && !!session

	const handleSignOut = async () => {
		setIsSigningOut(true)
		try {
			await authClient.signOut()
		}
		catch (error) {
			console.error("[AuthProvider] Sign-out failed:", error)
			throw error
		}
		finally {
			setIsSigningOut(false)
		}
	}

	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") {
				refetch()
			}
		}
		document.addEventListener("visibilitychange", handleVisibilityChange)
		return () => document.removeEventListener("visibilitychange", handleVisibilityChange)
	}, [refetch])

	return (
		<AuthContext.Provider
			value={{
				user,
				session,
				isLoading,
				isAuthenticated,
				signOut: handleSignOut,
				refetch,
			}}
		>
			{children}
		</AuthContext.Provider>
	)
}
