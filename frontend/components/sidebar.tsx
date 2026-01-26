"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  ChevronUp,
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
import { useAuth } from "@/components/auth-provider"
import { Logo } from "./tlg"
import { ThemeToggler } from "./theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "./ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

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

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, signOut } = useAuth()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

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
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="h-14 flex-row items-center justify-start gap-3 px-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Logo 
            className="size-8 shrink-0 rounded-lg" 
            backgroundClassName="fill-transparent dark:fill-[#140005]" 
          />
          {!isCollapsed && (
            <span className="text-sm font-semibold tracking-wide text-foreground">
              Resumemo
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">
            Main
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {secondaryNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <item.icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <div className="flex items-center justify-center py-1">
          <ThemeToggler />
        </div>

        {user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-7 border border-border shrink-0">
                      <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-medium">{user.name ?? "User"}</span>
                      <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                    </div>
                    <ChevronUp className="ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">
                      <Settings className="mr-2 size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/help" className="cursor-pointer">
                      <HelpCircle className="mr-2 size-4" />
                      Help & Support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
