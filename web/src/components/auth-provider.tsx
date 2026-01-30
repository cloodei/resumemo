import { createContext, useContext, useState } from "react"
import { authClient, useSession } from "@/lib/auth"

type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null | undefined;
  createdAt: Date;
  updatedAt: Date;
}

type Session = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  expiresAt: Date;
  token: string;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
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

function useAuth() {
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
      console.error(error)
    }
    finally {
      setIsSigningOut(false)
    }
  }

  const handleRefetch = async () => {
    await refetch()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
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

export { useAuth }
