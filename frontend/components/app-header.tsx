"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Logo } from "./tlg"
import { Button } from "./ui/button"
import { ThemeToggler } from "./theme-toggle"

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs/new", label: "New Job" },
  { href: "/jd-library", label: "JD Library" }
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50">
      <div className="relative border-b border-white/5 bg-[#05050f]/80 shadow-[0_12px_45px_rgba(2,2,8,0.65)] backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-purple-500/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-[radial-gradient(circle_at_bottom,var(--tw-gradient-stops))] from-purple-900/30 via-transparent to-transparent" />
        </div>
        <div className="relative mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="group flex items-center gap-3">
            <Logo className="size-8 rounded-xl" backgroundClassName="fill-[#fff0] dark:fill-[#140005]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.5em] text-gray-500">Resumemo</p>
              <p className="text-sm font-semibold text-white transition-colors group-hover:text-purple-200">
                AI Talent Suite
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <nav className="hidden gap-2 rounded-full border border-white/5 bg-white/5 px-2 py-1 md:flex">
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
                          ? "border border-white/10 bg-white/10 text-white shadow-[0_0_20px_rgba(99,102,241,0.35)]"
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

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-purple-200/90 xl:flex">
              <span>Beta access</span>
              <span className="text-gray-400">v0.9</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                className="shadow-sm transition-all hover:shadow-purple-500/30 md:hidden"
              >
                <Menu className="size-4" />
              </Button>
              <ThemeToggler />
              <Button className="hidden rounded-full bg-linear-to-r from-purple-500 to-indigo-500 text-sm font-semibold text-white shadow-[0_8px_25px_rgba(99,102,241,0.35)] hover:from-purple-400 hover:to-indigo-400 md:inline-flex">
                Book a demo
              </Button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
