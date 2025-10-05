"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu } from "lucide-react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThemeToggler } from "./theme-toggle"

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/jobs/new", label: "New Job" },
  { href: "/jd-library", label: "JD Library" }
]

export function AppHeader() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 shadow-[0_2px_8px_rgba(0,0,0,0.04),0_1px_0px_rgba(0,0,0,0.02)] backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 text-sm font-semibold tracking-tight transition-transform hover:scale-[1.02]">
          <Image
            src="/Rectangle.png"
            alt="Logo"
            width={36}
            height={36}
          />
          <span className="hidden bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text sm:inline-flex">
            Résumé Ranker
          </span>
        </Link>

        <nav className="hidden gap-1.5 md:flex">
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
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_1px_2px_rgba(0,0,0,0.05)]"
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
