import { Link, useLocation } from "react-router-dom"
import {
	ChevronUp,
	FilePlus2,
	HelpCircle,
	LayoutDashboard,
	LogOut,
	Settings,
} from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { SignOutDialog } from "@/components/auth/signout-dialog"
import { Logo } from "@/components/brand/logo"
import { ThemeToggler } from "@/components/brand/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
} from "@/components/ui/sidebar"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const mainNavItems = [
	{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Overview & recent sessions" },
	{ href: "/profiling", label: "Sessions", icon: FilePlus2, description: "History & ongoing profiling" },
	{ href: "/profiling/new", label: "New Session", icon: FilePlus2, description: "Upload resumes & start profiling" },
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
			<SidebarHeader className={`h-14 flex-row items-center gap-2 px-3 ${isCollapsed ? "justify-center" : "justify-between"}`}>
				{!isCollapsed && (
					<Link to="/dashboard" className="flex min-w-0 items-center gap-2.5">
						<Logo className="size-8 shrink-0 rounded-lg" backgroundClassName="fill-transparent dark:fill-[#140005]" />
						<span className="truncate text-sm font-semibold tracking-wide text-foreground">Resumemo</span>
					</Link>
				)}
				<SidebarTrigger className="shrink-0" />
			</SidebarHeader>

			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupLabel className="text-[10px] uppercase tracking-wider">Main</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{mainNavItems.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
										<Link to={item.href}>
											<item.icon className="size-4" />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="text-[10px] uppercase tracking-wider">Workspace</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{secondaryNavItems.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton asChild isActive={pathname === item.href} tooltip={item.label}>
										<Link to={item.href}>
											<item.icon className="size-4" />
											<span>{item.label}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>

			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarMenuButton
							size="lg"
							className="group-data-[collapsible=icon]:justify-center"
						>
							<ThemeToggler className="h-7 w-7 shrink-0 rounded-md border border-border/60 bg-background/60 hover:bg-background/80" />
							<div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
								<span className="truncate font-medium">Theme</span>
								<span className="truncate text-xs text-muted-foreground">Switch workspace appearance</span>
							</div>
						</SidebarMenuButton>
					</SidebarMenuItem>
				</SidebarMenu>

				{user && (
					<SidebarMenu>
						<SidebarMenuItem>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
										<Avatar className="size-7 shrink-0 border border-border">
											<AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
											<AvatarFallback className="bg-primary/10 text-xs text-primary">
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
										<Link to="/settings" className="cursor-pointer"><Settings className="mr-2 size-4" />Settings</Link>
									</DropdownMenuItem>
									<DropdownMenuItem asChild>
										<Link to="/help" className="cursor-pointer"><HelpCircle className="mr-2 size-4" />Help & Support</Link>
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
