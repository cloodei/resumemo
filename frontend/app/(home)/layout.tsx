import { AppHeader } from "@/components/layout/app-header"

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-gradient-to-br from-background via-background to-muted">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
