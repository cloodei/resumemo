import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function ProfilingSessionSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			<section className="flex flex-col gap-4">
				<Skeleton className="h-6 w-28" />
				<div className="space-y-3">
					<Skeleton className="h-10 w-72" />
					<Skeleton className="h-4 w-80" />
					<Skeleton className="h-4 w-full max-w-3xl" />
				</div>
			</section>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
				{Array.from({ length: 2 }).map((_, index) => (
					<Card key={index} className="border-none shadow-x">
						<CardHeader className="space-y-3">
							<Skeleton className="h-6 w-40" />
							<Skeleton className="h-4 w-64" />
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-20 w-full" />
							<Skeleton className="h-20 w-full" />
						</CardContent>
					</Card>
				))}
			</div>

			<Card className="border-none shadow-m">
				<CardHeader className="space-y-3">
					<Skeleton className="h-6 w-44" />
					<Skeleton className="h-4 w-72" />
				</CardHeader>
				<CardContent className="space-y-4">
					{Array.from({ length: 4 }).map((_, index) => (
						<Skeleton key={index} className="h-18 w-full" />
					))}
				</CardContent>
			</Card>
		</div>
	)
}

export function ProfilingSessionsSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			<section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="space-y-3">
					<Skeleton className="h-8 w-56" />
					<Skeleton className="h-4 w-80" />
				</div>
				<Skeleton className="h-10 w-36" />
			</section>

			<Card className="border-none shadow-md">
				<CardHeader className="space-y-4 border-b border-border/30 pb-4">
					<Skeleton className="h-6 w-40" />
					<Skeleton className="h-10 w-72" />
				</CardHeader>
				<CardContent className="space-y-3 p-6">
					{Array.from({ length: 6 }).map((_, index) => (
						<Skeleton key={index} className="h-14 w-full" />
					))}
				</CardContent>
			</Card>
		</div>
	)
}
