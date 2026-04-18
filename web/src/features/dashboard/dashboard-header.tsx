import { motion } from "motion/react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type DashboardHeaderProps = {
	user?: {
		name?: string | null
		email?: string | null
		emailVerified?: boolean
		image?: string | null
	} | null
	isPending: boolean
	providerBadge: { label: string; color: string }
}

export function DashboardHeader({ user, isPending, providerBadge }: DashboardHeaderProps) {
	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
				{user && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.3 }}
						className="flex items-center gap-4"
					>
						<Avatar className="size-16 border-2 border-primary/20 shadow-lg">
							<AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
							<AvatarFallback className="bg-primary/10 text-xl font-semibold text-primary">
								{user.name?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U"}
							</AvatarFallback>
						</Avatar>
						<div className="flex flex-col gap-1">
							<div className="flex items-center gap-2">
								<h1 className="text-2xl font-bold tracking-tight">Welcome back, {user.name?.split(" ")[0] ?? "there"} 👋</h1>
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span>{user.email}</span>
								<Badge variant="outline" className={cn("gap-1 px-1.5 py-0 text-[10px]", providerBadge.color)}>{providerBadge.label}</Badge>
								{user.emailVerified && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">✓ Verified</Badge>}
							</div>
						</div>
					</motion.div>
				)}

				{isPending && (
					<div className="flex items-center gap-4">
						<div className="size-16 animate-pulse rounded-full bg-muted" />
						<div className="flex flex-col gap-2">
							<div className="h-7 w-48 animate-pulse rounded bg-muted" />
							<div className="h-4 w-32 animate-pulse rounded bg-muted" />
						</div>
					</div>
				)}
			</div>

			<p className="max-w-2xl text-balance text-sm text-muted-foreground">
				Monitor active screening work, jump into finished sessions, and let long-running jobs complete quietly in the background.
			</p>
		</section>
	)
}
