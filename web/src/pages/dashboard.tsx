import { Suspense } from "react"
import { useSuspenseQuery } from "@tanstack/react-query"

import { QueryErrorBoundary } from "@/components/feedback/query-error-boundary"
import { RouteErrorFallback } from "@/components/feedback/route-error-fallback"
import { ProfilingSessionsSkeleton } from "@/components/feedback/route-skeletons"
import { DashboardHeader } from "@/components/features/dashboard/dashboard-header"
import { DashboardMetrics } from "@/components/features/dashboard/dashboard-metrics"
import { DashboardRecentSessions } from "@/components/features/dashboard/dashboard-recent-sessions"
import {
	buildDashboardMetrics,
	buildDashboardRecentSessions,
	detectAuthProvider,
	getProviderBadge,
} from "@/components/features/dashboard/dashboard-utils"
import { DashboardWorkflowNotes } from "@/components/features/dashboard/dashboard-workflow-notes"
import { useSession } from "@/lib/auth"
import { profilingSessionsQueryOptions } from "@/lib/profiling-queries"

function DashboardContent() {
	const { data: session, isPending } = useSession()
	const { data: sessions } = useSuspenseQuery(profilingSessionsQueryOptions())
	const user = session?.user
	const authProvider = detectAuthProvider(user)
	const providerBadge = getProviderBadge(authProvider)
	const metrics = buildDashboardMetrics(sessions)
	const recentSessions = buildDashboardRecentSessions(sessions)

	return (
		<div className="flex flex-col gap-8">
			<DashboardHeader user={user} isPending={isPending} providerBadge={providerBadge} />
			<DashboardMetrics metrics={metrics} />
			<section className="grid gap-6 lg:grid-cols-[2fr_1fr]">
				<DashboardRecentSessions sessions={recentSessions} />
				<DashboardWorkflowNotes />
			</section>
		</div>
	)
}

export default function Page() {
	return (
		<QueryErrorBoundary
			fallback={(
				<RouteErrorFallback
					title="Could not load the dashboard"
					description="The workspace overview is temporarily unavailable. You can retry this page or jump into your profiling sessions directly."
					secondaryHref="/profiling"
					secondaryLabel="Go to sessions"
				/>
			)}
		>
			<Suspense fallback={<ProfilingSessionsSkeleton />}>
				<DashboardContent />
			</Suspense>
		</QueryErrorBoundary>
	)
}
