import { useEffect } from "react"
import { Bell, ChevronDown, HelpCircle, Settings } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/components/auth-provider"
import { AppSidebar } from "@/components/sidebar"
import { SignOutDialog } from "@/components/signout-dialog"
import { ThemeToggler } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated)
      navigate("/login", { replace: true })
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="relative flex h-16 shrink-0 items-center border-b border-border/50 bg-background/70 px-4 backdrop-blur">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
          <div className="pointer-events-none absolute right-6 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />
          <div className="relative flex w-full items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
                <span className="text-sm font-semibold tracking-wide">Workspace</span>
              </div>
              <Badge variant="secondary" className="hidden text-[10px] uppercase tracking-wider sm:inline-flex">
                Recruiter
              </Badge>
            </div>
            <div className="ml-auto flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="hidden md:inline-flex">
                    <Bell className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Notifications</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="hidden md:inline-flex">
                    <HelpCircle className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Help</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="hidden md:inline-flex">
                    <Settings className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>
              <ThemeToggler className="h-9 w-9" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex h-10 items-center gap-2 px-2">
                    <Avatar className="size-8 border border-border">
                      <AvatarImage src={user?.image ?? undefined} alt={user?.name ?? "User"} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium leading-none">
                        {user?.name ?? "User"}
                      </span>
                      <span className="text-[11px] text-muted-foreground leading-tight">
                        {user?.email}
                      </span>
                    </div>
                    <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 border border-border">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm font-medium">{user?.name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="cursor-pointer">
                      Workspace settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/help" className="cursor-pointer">
                      Help & support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <SignOutDialog
                    trigger={
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={(event) => event.preventDefault()}
                      >
                        Sign out
                      </DropdownMenuItem>
                    }
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-6 py-6">
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
