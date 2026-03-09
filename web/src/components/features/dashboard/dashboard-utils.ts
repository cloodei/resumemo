import type { ProfilingSession } from "@/lib/profiling-queries"

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

function formatSessionDate(date: string | Date) {
	return dateFormatter.format(new Date(date))
}

export function buildDashboardMetrics(sessions: ProfilingSession[]): DashboardMetric[] {
	const activeSessions = sessions.filter((session) => session.status === "processing" || session.status === "retrying")
	const completedSessions = sessions.filter((session) => session.status === "completed")
	const failedSessions = sessions.filter((session) => session.status === "failed")
	const totalFiles = sessions.reduce((sum, session) => sum + session.totalFiles, 0)

	return [
		{
			label: "Total Sessions",
			value: sessions.length.toString(),
			change: sessions.length === 0 ? "Create your first screening session to get started" : `${completedSessions.length} ready for review`,
		},
		{
			label: "Active Sessions",
			value: activeSessions.length.toString(),
			change: activeSessions.length === 0 ? "No background jobs running right now" : `${activeSessions.length} running in the background`,
		},
		{
			label: "Files Uploaded",
			value: totalFiles.toString(),
			change: sessions.length === 0 ? "Uploads appear here once a session is created" : `${Math.round(totalFiles / sessions.length) || 0} files per session on average`,
		},
		{
			label: failedSessions.length > 0 ? "Needs Attention" : "Completed Sessions",
			value: (failedSessions.length > 0 ? failedSessions.length : completedSessions.length).toString(),
			change: failedSessions.length > 0 ? "Retry failed sessions when you are ready" : "Finished sessions stay available for later review",
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
