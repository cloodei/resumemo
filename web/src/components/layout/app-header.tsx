import { Bell, HelpCircle, Settings } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
		</>
	)
}

function WorkspaceBadge() {
	return (
		<div className="flex items-center gap-3">
			<div className="flex items-center gap-2">
				<div className="size-2 rounded-full bg-primary shadow-[0_0_0_4px_rgba(59,130,246,0.1)]" />
				<span className="text-sm font-semibold tracking-wide">Workspace</span>
			</div>
			<Badge variant="secondary" className="hidden text-[10px] uppercase tracking-wider sm:inline-flex">Recruiter</Badge>
		</div>
	)
}

export function AppHeader() {
	return (
		<header className="relative flex h-16 shrink-0 items-center border-b border-border/50 bg-background/70 px-4 backdrop-blur">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/50 to-transparent" />
			<div className="pointer-events-none absolute right-6 top-1/2 h-12 w-12 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl" />

			<div className="relative flex w-full items-center gap-3">
				<WorkspaceBadge />

				<div className="ml-auto flex items-center gap-1.5">
					<HeaderActions />
				</div>
			</div>
		</header>
	)
}
