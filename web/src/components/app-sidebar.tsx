import { Link, useLocation } from "react-router-dom"
import {
  ChevronUp,
  LayoutDashboard,
  Upload,
  UserSearch,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react"
import { useAuth } from "@/components/auth-provider"
import { SignOutDialog } from "./signout-dialog"
import { Logo } from "./tlg"
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
  SidebarTrigger,
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & recent sessions" },
  { href: "/uploads", label: "Upload Resumes", icon: Upload, description: "Upload resume files" },
  { href: "/profiling/new", label: "New Profiling", icon: UserSearch, description: "Start a profiling session" },
]

const secondaryNavItems = [
  { href: "/settings", label: "Settings", icon: Settings, description: "Workspace settings" },
  { href: "/help", label: "Help & Support", icon: HelpCircle, description: "Documentation & support" },
]

export function AppSidebar() {
	const { pathname } = useLocation()
  const { user } = useAuth()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className={`h-14 flex-row items-center gap-2 px-3 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && (
          <Link to="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <Logo 
              className="size-8 shrink-0 rounded-lg" 
              backgroundClassName="fill-transparent dark:fill-[#140005]" 
            />
            <span className="text-sm font-semibold tracking-wide text-foreground truncate">
              Resumemo
            </span>
          </Link>
        )}
        <SidebarTrigger className="shrink-0" />
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
                      <Link to={item.href}>
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
                      <Link to={item.href}>
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
                    <Link to="/settings" className="cursor-pointer">
                      <Settings className="mr-2 size-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/help" className="cursor-pointer">
                      <HelpCircle className="mr-2 size-4" />
                      Help & Support
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <SignOutDialog
                    trigger={
                      <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <LogOut className="mr-2 size-4" />
                        Sign out
                      </DropdownMenuItem>
                    }
                  />
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
