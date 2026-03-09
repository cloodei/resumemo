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

export const dashboardMetrics = [
	{ label: "Active Sessions", value: "12", change: "+3.8% vs last week" },
	{ label: "Resumes Uploaded", value: "6,284", change: "+18.2%" },
	{ label: "Avg. Profiling Time", value: "4m 12s", change: "-1m 05s" },
	{ label: "Background Jobs", value: "Always On", change: "Sessions keep running after you leave" },
] as const

export const dashboardRecentSessions = [
	{ id: "prof-2f8a9c1d", name: "Senior Frontend Engineer - Q1 2026", jobTitle: "Senior Frontend Engineer", createdAt: "Jan 28, 2026", resumes: 48, status: "completed" },
	{ id: "prof-9e3b7a2f", name: "Product Design Lead", jobTitle: "Product Designer", createdAt: "Jan 25, 2026", resumes: 32, status: "processing" },
	{ id: "prof-1c5d8e4b", name: "AI Research Team", jobTitle: "AI Research Scientist", createdAt: "Jan 22, 2026", resumes: 64, status: "completed" },
] as const
