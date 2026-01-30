import { ThemeProvider } from "next-themes"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { Toaster } from "./ui/sonner"
import { AuthProvider } from "./auth-provider"

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          {children}
        </AuthProvider>

        <Toaster richColors position="top-center" closeButton />
      </ThemeProvider>
    </QueryClientProvider>
  )
}

