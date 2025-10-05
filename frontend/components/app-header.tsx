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
    <header className="sticky top-0 z-50 bg-background backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="group flex items-center transition-transform">
          <svg viewBox="0 0 990 1000" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 mr-2">
            <rect x="1.21767" y="1.03627" width="987.565" height="997.927" rx="154.404" className="dark:fill-[#13131ddc] stroke-[#e5e7eb] dark:stroke-[#3B3B43]" strokeWidth="2.07254" />
            <path d="M487.228 725.389C487.228 748.281 505.786 766.839 528.679 766.839H663.394H715.207C743.823 766.839 767.021 743.642 767.021 715.026V277.202C767.021 248.586 743.823 225.389 715.207 225.389H264.43C235.814 225.389 212.617 248.586 212.617 277.202V715.026C212.617 743.642 235.814 766.839 264.43 766.839H291.785C305.767 766.839 319.154 761.189 328.908 751.172L570.751 502.792C587.643 485.444 587.458 457.743 570.337 440.622C553.053 423.338 525.03 423.338 507.746 440.622L402.104 546.264C369.463 578.905 313.653 555.787 313.653 509.626V370.466C313.653 341.85 336.851 318.653 365.466 318.653H627.124C655.74 318.653 678.938 341.85 678.938 370.466V621.762C678.938 650.377 655.74 673.575 627.124 673.575H539.041C510.426 673.575 487.228 696.773 487.228 725.389Z" fill="#6C47FF" />
          </svg>
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
