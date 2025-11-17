import { AppHeader } from "@/components/app-header"

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col bg-linear-to-br from-background via-background to-muted">
      <AppHeader />
      <main className="mx-auto w-full xl:max-w-6xl 2xl:max-w-7xl flex-1 px-4 pb-12 pt-4">
        {children}
      </main>
    </div>
  )
}
