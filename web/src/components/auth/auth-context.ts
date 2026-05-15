import { createContext, useContext } from "react"

export type AuthUser = {
	id: string
	name: string
	email: string
	emailVerified: boolean
	image?: string | null | undefined
	createdAt: Date
	updatedAt: Date
}

export type AuthSession = {
	id: string
	createdAt: Date
	updatedAt: Date
	userId: string
	expiresAt: Date
	token: string
	ipAddress?: string | null | undefined
	userAgent?: string | null | undefined
}

export type AuthContextType = {
	user: AuthUser | null
	session: AuthSession | null
	isLoading: boolean
	isAuthenticated: boolean
	signOut: () => Promise<void>
	refetch: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
	const context = useContext(AuthContext)
	if (!context)
		throw new Error("useAuth must be used within an AuthProvider")

	return context
}
