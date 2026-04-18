import type { CandidateResult, CandidateResultDetail, ParsedProfile, SessionStatus } from "@/features/profiling/profiling-queries"

export type RetryMode = "rerun_current" | "clone_current" | "clone_with_updates" | "replace_with_updates"

export type RetryFormValues = {
	name: string
	jobTitle: string
	jobDescription: string
}

export const retryModeCopy: Record<RetryMode, {
	label: string
	description: string
	buttonLabel: string
	requiresUpdates: boolean
	target: "current" | "new"
}> = {
	rerun_current: {
		label: "Retry now",
		description: "Rerun this exact session in place with the same resumes and the same screening brief.",
		buttonLabel: "Retry this session",
		requiresUpdates: false,
		target: "current",
	},
	clone_current: {
		label: "New copy",
		description: "Create a new session using the same resumes and current brief while keeping this one intact.",
		buttonLabel: "Create new copied session",
		requiresUpdates: false,
		target: "new",
	},
	clone_with_updates: {
		label: "Update as new",
		description: "Edit the brief, then create a new follow-up session with the same resumes.",
		buttonLabel: "Create updated session",
		requiresUpdates: true,
		target: "new",
	},
	replace_with_updates: {
		label: "Update and replace",
		description: "Edit this session and rerun it in place, replacing the current result set.",
		buttonLabel: "Update and rerun",
		requiresUpdates: true,
		target: "current",
	},
}

export function getDisplayCandidateName(candidate: CandidateResult) {
	const confidence = Number(candidate.parsedProfile?.name_confidence ?? 0)
	if (candidate.candidateName && confidence >= 0.5)
		return candidate.candidateName

	return candidate.originalName
}

export function needsManualReview(candidate: CandidateResult) {
	return (candidate.parsedProfile?.parse_warnings?.length ?? 0) > 0
}

export function getManualReviewLabel(candidate: CandidateResult) {
	const warnings = new Set(candidate.parsedProfile?.parse_warnings ?? [])
	if (warnings.has("name_missing_or_invalid"))
		return "Please verify the candidate name manually"
	if (warnings.has("work_history_not_confident"))
		return "Please double-check work history and experience"
	if (warnings.has("skills_not_confident"))
		return "Please confirm key skills from the resume"
	return "A manual review is recommended"
}

export function getExperienceLabel(candidate: { parsedProfile?: ParsedProfile }) {
	const years = candidate.parsedProfile?.total_experience_years
	if (typeof years !== "number")
		return null

	return `${years} year${years === 1 ? "" : "s"} experience`
}

export function getPrimarySkills(candidate: CandidateResult) {
	const matched = candidate.skillsMatched ?? []
	if (matched.length > 0)
		return matched.slice(0, 5)

	return (candidate.parsedProfile?.skills ?? []).slice(0, 5)
}

export function getMissingSkills(detail: CandidateResultDetail) {
	const skillMatch = detail.scoreBreakdown?.skill_match
	const missing = skillMatch?.details?.missing
	return Array.isArray(missing) ? missing.filter(item => typeof item === "string") as string[] : []
}

export function getRecentRoles(detail: CandidateResultDetail) {
	return (detail.parsedProfile?.work_history ?? []).slice(0, 3)
}

export function getEducationLines(detail: CandidateResultDetail) {
	return (detail.parsedProfile?.education ?? []).map((entry) => {
		return [entry.degree, entry.institution, entry.year].filter(Boolean).join(" • ")
	}).filter(Boolean)
}

export function statusBadgeVariant(status: SessionStatus) {
	switch (status) {
		case "processing":
		case "retrying":
			return "secondary"
		case "completed":
			return "default"
		case "failed":
			return "destructive"
	}
}

export function statusLabel(status: SessionStatus) {
	switch (status) {
		case "processing":
			return "queued"
		case "retrying":
			return "refreshing"
		case "completed":
			return "completed"
		case "failed":
			return "needs attention"
	}
}
