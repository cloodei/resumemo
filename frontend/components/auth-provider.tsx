"use client"

import { createContext, useContext, useState } from "react"
import { authClient, useSession } from "@/lib/auth"

type User = {
  id: string
  name: string | null
  email: string
  emailVerified: boolean
  image: string | null
  createdAt: Date
  updatedAt: Date
}

type Session = {
  id: string
  userId: string
  expiresAt: Date
  token: string
  createdAt: Date
  updatedAt: Date
  ipAddress: string | null
  userAgent: string | null
}

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signOut: () => Promise<void>
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

type AuthProviderProps = {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { data: sessionData, isPending, error, refetch } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const user = sessionData?.user ?? null
  const session = sessionData?.session ?? null
  const isLoading = isPending || isSigningOut
  const isAuthenticated = !!user && !!session

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await authClient.signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  const handleRefetch = async () => {
    await refetch()
  }

  return (
    <AuthContext.Provider
      value={{
        user: user as User | null,
        session: session as Session | null,
        isLoading,
        isAuthenticated,
        signOut: handleSignOut,
        refetch: handleRefetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
