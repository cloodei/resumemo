"use client"

import Link from "next/link"
import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronLeft,
  LayoutDashboard,
  PlusCircle,
  FolderOpen,
  Settings,
  HelpCircle,
  LogOut,
  BarChart3,
  FileText,
  Users,
  Bell,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"
import { Logo } from "./tlg"
import { Button } from "./ui/button"
import { ThemeToggler } from "./theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { Separator } from "./ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip"

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs/new", label: "New Job", icon: PlusCircle },
  { href: "/jobs", label: "All Jobs", icon: FolderOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/templates", label: "Templates", icon: FileText },
]

const secondaryNavItems = [
  { href: "/team", label: "Team", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/help", label: "Help & Support", icon: HelpCircle },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("Signed out")
      router.push("/login")
    } catch {
      toast.error("Unable to sign out")
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex h-screen flex-col border-r border-border/50 bg-sidebar transition-all duration-300",
          collapsed ? "w-[68px]" : "w-64"
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Logo className="size-9 shrink-0 rounded-xl" backgroundClassName="fill-transparent dark:fill-[#140005]" />
            {!collapsed && (
              <span className="text-sm font-semibold tracking-wide text-foreground">
                Resumemo
              </span>
            )}
          </Link>
        </div>

        {/* Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 z-10 size-6 rounded-full border border-border bg-background shadow-sm hover:bg-muted"
        >
          <ChevronLeft className={cn("size-3.5 transition-transform", collapsed && "rotate-180")} />
        </Button>

        {/* Main navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className={cn("mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground", collapsed && "sr-only")}>
            Main
          </p>
          {mainNavItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
            const NavLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="size-4.5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return NavLink
          })}

          <Separator className="my-4" />

          <p className={cn("mb-2 px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground", collapsed && "sr-only")}>
            Workspace
          </p>
          {secondaryNavItems.map((item) => {
            const isActive = pathname === item.href
            const NavLink = (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className="size-4.5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            )

            if (collapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{NavLink}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={10}>
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              )
            }

            return NavLink
          })}
        </nav>

        {/* Footer - User profile and theme */}
        <div className="border-t border-border/50 p-3">
          <div className="mb-3 flex items-center justify-center">
            <ThemeToggler />
          </div>

          {user && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted",
                collapsed && "justify-center"
              )}
            >
              <Avatar className="size-8 border border-border shrink-0">
                <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex flex-1 flex-col overflow-hidden">
                  <span className="truncate text-sm font-medium">{user.name ?? "User"}</span>
                  <span className="truncate text-[11px] text-muted-foreground">{user.email}</span>
                </div>
              )}
              {!collapsed && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sign out</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {collapsed && user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mx-auto mt-2 flex size-8 text-muted-foreground hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          )}
        </div>
      </aside>
    </TooltipProvider>
  )
}
