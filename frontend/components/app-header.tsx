"use client"

import Link from "next/link"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggler } from "./theme-toggle"
import { Logo } from "./tlg"

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs/new", label: "New Job" },
  { href: "/jd-library", label: "JD Library" }
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 bg-background backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center transition-transform">
          <Logo className="size-8 mr-2" />
          <span className="bg-gradient-to-r font-semibold tracking-tight text-transparent from-primary to-primary/25 bg-clip-text text-sm">
            Résumé Ranker
          </span>
        </Link>

        <nav className="hidden gap-3 md:flex">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={isActive ? "#" : item.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "relative font-medium transition-all",
                    isActive
                      ? "disabled:opacity-100 text-primary shadow-[inset_0_-2px_0_0_currentColor] after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-3/4 after:-translate-x-1/2 after:rounded-full after:bg-primary after:shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:shadow-m"
                  )}
                  disabled={isActive}
                >
                  {item.label}
                </Button>
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button 
            size="icon" 
            variant="ghost" 
            className="shadow-sm transition-all hover:shadow-md md:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <ThemeToggler />
        </div>
      </div>
    </header>
  )
}
