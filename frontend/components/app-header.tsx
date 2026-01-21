"use client"

import Link from "next/link"
import { toast } from "sonner"
import { Menu } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

import { cn } from "@/lib/utils"
import { Logo } from "./tlg"
import { Button } from "./ui/button"
import { ThemeToggler } from "./theme-toggle"
import { Avatar, AvatarFallback } from "./ui/avatar"
import { authClient, useSession } from "@/lib/auth"

const navItems = [
	{ href: "/dashboard", label: "Dashboard" },
	{ href: "/jobs/new", label: "New Job" },
	{ href: "/jd-library", label: "JD Library" }
]

export function AppHeader() {
	const pathname = usePathname()
	const router = useRouter()
	const { data: session } = useSession()

	const handleSignOut = async () => {
		const { error } = await authClient.signOut()
		if (error) {
			toast.error(error.message ?? "Unable to sign out")
			return
		}

		toast.success("Signed out")
		router.push("/login")
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
					{session?.user ? (
						<div className="flex items-center gap-2">
							<Avatar className="size-8 border border-border">
								<AvatarFallback className="text-xs">
									{session.user.name?.[0]?.toUpperCase() ?? session.user.email?.[0]?.toUpperCase() ?? "U"}
								</AvatarFallback>
							</Avatar>
							<Button 
								size="sm" 
								variant="ghost" 
								className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
								onClick={handleSignOut}
							>
								Sign out
							</Button>
						</div>
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
