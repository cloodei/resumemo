import { Bell, ChevronDown, HelpCircle, Settings } from "lucide-react"
import { Link } from "react-router-dom"
import { useAuth } from "@/components/auth-provider"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

function HeaderActions() {
  return (
    <>
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
    </>
  )
}

function UserMenu() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex h-10 items-center gap-2 px-2">
          <Avatar className="size-8 border border-border">
            <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium leading-none">
              {user.name ?? "User"}
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              {user.email}
            </span>
          </div>
          <ChevronDown className="hidden size-4 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 border border-border">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium">{user.name ?? "User"}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
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
  )
}

function WorkspaceBadge() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
        <span className="text-sm font-semibold tracking-wide">Workspace</span>
      </div>
      <Badge variant="secondary" className="hidden text-[10px] uppercase tracking-wider sm:inline-flex">
        Recruiter
      </Badge>
    </div>
  )
}

export function AppHeader() {
  return (
    <header className="relative flex h-16 shrink-0 items-center border-b border-border/50 bg-background/70 px-4 backdrop-blur">
      {/* Decorative elements */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
      <div className="pointer-events-none absolute right-6 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />
      
      <div className="relative flex w-full items-center gap-3">
        <WorkspaceBadge />
        
        <div className="ml-auto flex items-center gap-1.5">
          <HeaderActions />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
