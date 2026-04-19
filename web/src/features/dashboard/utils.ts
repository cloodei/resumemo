import { fetchProfilingSessions } from "@/features/profiling/api/profiling-sessions"

type ProfilingSession = Awaited<ReturnType<typeof fetchProfilingSessions>>[number]

export function detectAuthProvider(user?: { image?: string | null; email?: string | null }) {
	if (!user)
		return "email"
	if (user.image?.includes("googleusercontent.com"))
		return "google"
	if (user.image?.includes("avatars.githubusercontent.com"))
		return "github"

	return "email"
}

export function getProviderBadge(provider: string) {
	switch (provider) {
		case "google":
			return { label: "Google", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" }
		case "github":
			return { label: "GitHub", color: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20" }
		default:
			return { label: "Email", color: "bg-primary/10 text-primary border-primary/20" }
	}
}

export type DashboardMetric = {
	label: string
	value: string
	change: string
}

export type DashboardRecentSession = {
	id: string
	name: string
	jobTitle: string
	createdAt: string
	resumes: number
	status: ProfilingSession["status"]
}

const dateFormatter = new Intl.DateTimeFormat("en", {
	month: "short",
	day: "numeric",
	year: "numeric",
})

const numberFormatter = new Intl.NumberFormat("en")

function formatSessionDate(date: string | Date) {
	if (date instanceof Date)
		return dateFormatter.format(date)

	return dateFormatter.format(new Date(date))
}

export function buildDashboardMetrics(sessions: ProfilingSession[]): DashboardMetric[] {
	const totalSessions = sessions.length
	let activeSessions: ProfilingSession[] = [],
		queuedSessions: ProfilingSession[] = [],
		retryingSessions: ProfilingSession[] = [],
		completedSessions: ProfilingSession[] = [],
		failedSessions: ProfilingSession[] = [];
	let totalFiles = 0

	for (let i = 0; i < sessions.length; i++) {
		const session = sessions[i]
		if (session.status === "processing" || session.status === "retrying")
			activeSessions.push(session)
		if (session.status === "processing")
			queuedSessions.push(session)
		else if (session.status === "retrying")
			retryingSessions.push(session)
		else if (session.status === "completed")
			completedSessions.push(session)
		else if (session.status === "failed")
			failedSessions.push(session)

		totalFiles += session.totalFiles
	}

	const completionRate = totalSessions === 0 ? 0 : Math.round((completedSessions.length / totalSessions) * 100)
	const averageFilesPerSession = totalSessions === 0 ? 0 : Math.round(totalFiles / totalSessions)

	return [
		{
			label: "Session Volume",
			value: numberFormatter.format(totalSessions),
			change: totalSessions === 0
				? "Create your first screening session to start building momentum"
				: `${totalSessions} total, ${completedSessions.length} completed${failedSessions.length > 0 ? `, ${failedSessions.length} need attention` : ""}`,
		},
		{
			label: "Background Jobs",
			value: numberFormatter.format(activeSessions.length),
			change: activeSessions.length === 0
				? "No sessions are currently processing in the background"
				: `${queuedSessions.length} queued, ${retryingSessions.length} refreshing`,
		},
		{
			label: "Completion Rate",
			value: `${completionRate}%`,
			change: totalSessions === 0
				? "Completion rate appears once sessions begin finishing"
				: `${completedSessions.length} of ${totalSessions} sessions are ready to review`,
		},
		{
			label: "Resume Files",
			value: numberFormatter.format(totalFiles),
			change: totalSessions === 0
				? "Uploaded resumes will accumulate here across every session"
				: `${averageFilesPerSession} files per session on average`,
		},
	]
}

export function buildDashboardRecentSessions(sessions: ProfilingSession[]): DashboardRecentSession[] {
	return [...sessions]
		.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
		.slice(0, 6)
		.map((session) => ({
			id: session.id,
			name: session.name,
			jobTitle: session.jobTitle || "Custom brief",
			createdAt: formatSessionDate(session.createdAt),
			resumes: session.totalFiles,
			status: session.status,
		}))
}
