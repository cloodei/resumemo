import { AlertTriangle, ArrowLeft, RefreshCw } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type RouteErrorFallbackProps = {
	title: string
	description: string
	primaryLabel?: string
	onPrimaryAction?: () => void
	secondaryHref?: string
	secondaryLabel?: string
}

export function RouteErrorFallback({
	title,
	description,
	primaryLabel = "Try again",
	onPrimaryAction,
	secondaryHref = "/dashboard",
	secondaryLabel = "Back to dashboard",
}: RouteErrorFallbackProps) {
	return (
		<div className="flex min-h-[60vh] items-center justify-center px-4 py-8">
			<Card className="w-full max-w-2xl border-none shadow-x">
				<CardHeader className="space-y-4 text-center">
					<div className="mx-auto flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
						<AlertTriangle className="size-8" />
					</div>
					<div className="space-y-2">
						<CardTitle className="text-2xl font-semibold tracking-tight">{title}</CardTitle>
						<CardDescription className="mx-auto max-w-xl text-sm">{description}</CardDescription>
					</div>
				</CardHeader>
				<CardContent className="flex flex-wrap items-center justify-center gap-3">
					{onPrimaryAction && (
						<Button className="gap-2" onClick={onPrimaryAction}>
							<RefreshCw className="size-4" />
							{primaryLabel}
						</Button>
					)}
					<Button asChild variant="outline" className="gap-2">
						<Link to={secondaryHref}>
							<ArrowLeft className="size-4" />
							{secondaryLabel}
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	)
}
