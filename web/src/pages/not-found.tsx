import { ArrowLeft, Compass, Home, Search } from "lucide-react"
import { Link } from "react-router-dom"

import { useAuth } from "@/components/auth/auth-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function NotFoundPage() {
	const { isAuthenticated, isLoading } = useAuth()

	if (isLoading) {
		return (
			<div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
				<div className="flex flex-col items-center gap-4 text-center">
					<div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
					<p className="text-sm text-muted-foreground">Preparing the fallback page...</p>
				</div>
			</div>
		)
	}

	return isAuthenticated ? <AuthenticatedNotFound /> : <PublicNotFound />
}

function AuthenticatedNotFound() {
	return (
		<div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
			<Card className="w-full max-w-3xl border-none shadow-x">
				<CardHeader className="space-y-4 text-center">
					<Badge className="mx-auto w-fit bg-primary/10 text-primary">Page not found</Badge>
					<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-muted/60 text-primary">
						<Compass className="size-8" />
					</div>
					<div className="space-y-2">
						<CardTitle className="text-3xl font-semibold tracking-tight">This workspace page does not exist</CardTitle>
						<CardDescription className="mx-auto max-w-xl text-sm">
							The link may be outdated, incomplete, or no longer available. You can head back to your dashboard or browse active profiling sessions.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-3 md:grid-cols-2">
						<Link to="/dashboard" className="block">
							<div className="rounded-xl border border-border/50 bg-muted/20 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5">
								<p className="font-medium text-foreground">Go to dashboard</p>
								<p className="mt-2 text-sm text-muted-foreground">Return to your main workspace and recent activity.</p>
							</div>
						</Link>
						<Link to="/profiling" className="block">
							<div className="rounded-xl border border-border/50 bg-muted/20 p-4 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5">
								<p className="font-medium text-foreground">Browse profiling sessions</p>
								<p className="mt-2 text-sm text-muted-foreground">Open completed, queued, or retryable screening sessions.</p>
							</div>
						</Link>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-3">
						<Button asChild className="gap-2">
							<Link to="/profiling">
								<Search className="size-4" />
								View sessions
							</Link>
						</Button>
						<Button asChild variant="outline" className="gap-2">
							<Link to="/dashboard">
								<ArrowLeft className="size-4" />
								Back to dashboard
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}

function PublicNotFound() {
	return (
		<div className="flex min-h-[100vh] items-center justify-center bg-[#070709] px-4 py-12 text-white">
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -left-24 top-[-10%] size-[420px] rounded-full bg-[#2563eb]/20 blur-[140px]" />
				<div className="absolute right-[-20%] top-[-20%] size-[520px] rounded-full bg-[#0ea5e9]/15 blur-[160px]" />
			</div>

			<Card className="relative w-full max-w-3xl border border-white/10 bg-white/5 text-white shadow-[0_25px_80px_rgba(0,0,0,0.45)] backdrop-blur-md">
				<CardHeader className="space-y-4 text-center">
					<Badge className="mx-auto w-fit border-white/10 bg-white/10 text-white">Page not found</Badge>
					<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/10 text-[#7dd3fc]">
						<Compass className="size-8" />
					</div>
					<div className="space-y-2">
						<CardTitle className="text-3xl font-semibold tracking-tight text-white">This page is not available</CardTitle>
						<CardDescription className="mx-auto max-w-xl text-sm text-slate-300">
							The link may be outdated or incomplete. You can return to the landing page or sign in to continue into the screening workspace.
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-3 md:grid-cols-2">
						<Link to="/" className="block">
							<div className="rounded-xl border border-white/10 bg-black/30 p-4 transition-all hover:-translate-y-0.5 hover:border-[#7dd3fc]/40 hover:bg-white/5">
								<p className="font-medium text-white">Return to landing</p>
								<p className="mt-2 text-sm text-slate-300">Go back to the main product overview and entry points.</p>
							</div>
						</Link>
						<Link to="/login" className="block">
							<div className="rounded-xl border border-white/10 bg-black/30 p-4 transition-all hover:-translate-y-0.5 hover:border-[#7dd3fc]/40 hover:bg-white/5">
								<p className="font-medium text-white">Sign in</p>
								<p className="mt-2 text-sm text-slate-300">Open the workspace and continue with your screening sessions.</p>
							</div>
						</Link>
					</div>

					<div className="flex flex-wrap items-center justify-center gap-3">
						<Button asChild className="gap-2 bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
							<Link to="/login">
								<Search className="size-4" />
								Open workspace
							</Link>
						</Button>
						<Button asChild variant="outline" className="gap-2 border-white/15 bg-transparent text-white hover:bg-white/5 hover:text-white">
							<Link to="/">
								<Home className="size-4" />
								Back to home
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
