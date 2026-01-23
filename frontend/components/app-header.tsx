"use client"

import Link from "next/link"
import { toast } from "sonner"
import { Menu, Github, LogOut, User, ChevronDown } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Logo } from "./tlg"
import { Button } from "./ui/button"
import { ThemeToggler } from "./theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { useAuth } from "@/components/auth-provider"
import { Skeleton } from "./ui/skeleton"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { Badge } from "./ui/badge"

const navItems = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/jobs/new", label: "New Job" },
	{ href: "/jd-library", label: "JD Library" }
]

// Helper to get provider display info
function getProviderInfo(accounts: { providerId: string }[] | undefined) {
  if (!accounts || accounts.length === 0) return null
  const provider = accounts[0]?.providerId
  if (provider === "google") return { label: "Google", icon: null, color: "text-blue-500" }
  if (provider === "github") return { label: "GitHub", icon: Github, color: "text-foreground" }
  return { label: "Email", icon: null, color: "text-muted-foreground" }
}

export function AppHeader() {
	const pathname = usePathname()
	const router = useRouter()
	const { user, isLoading, signOut } = useAuth()

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
		<header className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur-sm">
			<div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
				<Link href="/" className="flex shrink-0 items-center gap-3">
					<Logo className="size-9 rounded-xl" backgroundClassName="fill-transparent dark:fill-[#140005]" />
					<span className="text-sm font-semibold tracking-wide text-foreground">
						Resumemo
					</span>
				</Link>

				<nav className="hidden items-center gap-1 md:flex">
					{navItems.map((item) => {
						const isActive = pathname === item.href
						return (
							<Link key={item.href} href={item.href}>
								<Button
									variant="ghost"
									size="sm"
									className={cn(
										"px-4 text-sm font-medium text-muted-foreground transition-colors",
										"hover:bg-muted hover:text-foreground",
										isActive && "bg-muted text-foreground"
									)}
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
						className="md:hidden"
					>
						<Menu className="size-5" />
					</Button>
					<ThemeToggler />
					{isLoading ? (
						<div className="flex items-center gap-2">
							<Skeleton className="size-8 rounded-full" />
							<div className="hidden sm:flex flex-col gap-1">
								<Skeleton className="h-3 w-20" />
								<Skeleton className="h-2.5 w-28" />
							</div>
						</div>
					) : user ? (
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="ghost" className="flex items-center gap-2 px-2 h-10">
									<Avatar className="size-8 border border-border">
                    <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
										<AvatarFallback className="text-xs bg-primary/10 text-primary">
											{user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
										</AvatarFallback>
									</Avatar>
									<div className="hidden sm:flex flex-col items-start">
										<span className="text-sm font-medium leading-none">{user.name ?? "User"}</span>
										<span className="text-[11px] text-muted-foreground leading-tight">{user.email}</span>
									</div>
									<ChevronDown className="size-4 text-muted-foreground hidden sm:block" />
								</Button>
							</DropdownMenuTrigger>

							<DropdownMenuContent align="end" className="w-64 border border-border">
								<DropdownMenuLabel className="font-normal">
									<div className="flex flex-col gap-1.5">
										<p className="text-sm font-medium">{user.name}</p>
										<p className="text-xs text-muted-foreground truncate">{user.email}</p>
										{user.emailVerified && (
											<Badge variant="secondary" className="w-fit text-[10px] py-0">
												Verified
											</Badge>
										)}
									</div>
								</DropdownMenuLabel>

								<DropdownMenuSeparator />

								<DropdownMenuItem className="gap-2">
									<User className="size-4" />
									<span>Profile settings</span>
								</DropdownMenuItem>

								<DropdownMenuSeparator />

								<DropdownMenuItem 
									className="gap-2.5 text-destructive focus:text-destructive"
									onClick={handleSignOut}
								>
									<LogOut className="size-4" />
									<span>Sign out</span>
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : (
						<Button
							size="sm"
							className="bg-brand text-brand-foreground hover:bg-brand/90"
							onClick={() => router.push("/login")}
						>
							Sign in
						</Button>
					)}
				</div>
			</div>
		</header>
	)
}
