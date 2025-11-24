"use client"

import Link from "next/link"
import { toast } from "sonner"
import { Menu, Sparkles } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Logo } from "./tlg"
import { Button } from "./ui/button"
import { ThemeToggler } from "./theme-toggle"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { authClient, useSession } from "@/lib/auth"

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs/new", label: "New Job" },
  { href: "/jd-library", label: "JD Library" }
]

export function AppHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()

  const handleSignOut = async () => {
    const { error } = await authClient.signOut()
    if (error) {
      toast.error(error.message ?? "Unable to sign out")
      return
    }

    toast.success("Signed out")
    router.push("/login")
  }

  return (
    <header className="sticky top-0 z-50">
      <div className="relative border-b border-white/5 bg-[#05050f]/80 shadow-[0_12px_45px_rgba(2,2,8,0.65)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-purple-500/40 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(99,102,241,0.25),transparent_60%)]" />
        </div>
        <div className="relative mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-4">
            <div className="relative">
              <div className="absolute -inset-1 rounded-2xl bg-linear-to-r from-purple-500/20 to-indigo-500/20 blur-xl" />
              <Logo className="relative size-10 rounded-2xl" backgroundClassName="fill-[#fff0] dark:fill-[#140005]" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.6em] text-gray-500">Resumemo</p>
              <p className="text-base font-semibold text-white transition-colors group-hover:text-purple-200">
                Cinematic AI Talent Suite
              </p>
            </div>
          </Link>

          <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.4em] text-purple-200/90 lg:flex">
            <Sparkles className="size-3 text-purple-300" />
            <span>Realtime scoring</span>
            <span className="text-gray-400">v0.9</span>
          </div>

          <div className="flex flex-1 items-center justify-end gap-4">
            <nav className="hidden flex-1 items-center justify-center gap-2 rounded-full border border-white/5 bg-white/5 px-2 py-1 md:flex">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={isActive ? "#" : item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "group relative rounded-full px-4 text-sm font-medium tracking-tight text-gray-400 transition-all",
                        "hover:bg-white/5 hover:text-white",
                        isActive
                          ? "border border-white/10 bg-white/10 text-white shadow-[0_0_25px_rgba(99,102,241,0.35)]"
                          : "border border-transparent"
                      )}
                      disabled={isActive}
                    >
                      <span>{item.label}</span>
                      {isActive && (
                        <span className="absolute inset-x-4 -bottom-1 block h-0.5 rounded-full bg-linear-to-r from-purple-400 to-indigo-400" />
                      )}
                    </Button>
                  </Link>
                )
              })}
            </nav>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="shadow-sm transition-all hover:shadow-purple-500/30 md:hidden"
              >
                <Menu className="size-4" />
              </Button>
              <ThemeToggler />
              {session?.user ? (
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5">
                  <Avatar className="size-9 border border-white/20">
                    <AvatarFallback>
                      {session.user.name?.[0]?.toUpperCase() ?? session.user.email?.[0]?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left text-xs leading-tight text-white sm:block">
                    <p className="font-semibold">{session.user.name ?? "Member"}</p>
                    <p className="text-[11px] text-gray-400">{session.user.email}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-xs" onClick={handleSignOut}>
                    Sign out
                  </Button>
                </div>
              ) : (
                <Button
                  className="rounded-full bg-linear-to-r from-purple-500 to-indigo-500 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(99,102,241,0.35)] hover:from-purple-400 hover:to-indigo-400"
                  onClick={() => router.push("/login")}
                >
                  Sign in
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
