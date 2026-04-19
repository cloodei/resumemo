import { fetchCandidateResultDetail } from "@/features/profiling/api/candidate-detail"
import { fetchProfilingSessionDetail } from "@/features/profiling/api/profiling-session-detail"

export type ProfilingSessionDetailData = Awaited<ReturnType<typeof fetchProfilingSessionDetail>>
export type SessionStatus = ProfilingSessionDetailData["session"]["status"]
export type CandidateResult = NonNullable<ProfilingSessionDetailData["results"]>[number]
export type CandidateResultDetail = Awaited<ReturnType<typeof fetchCandidateResultDetail>>
export type WorkHistoryItem = {
	title: string | null
	company: string | null
	start_date: string | null
	end_date: string | null
	description: string | null
}
export type EducationItem = {
	degree: string | null
	institution: string | null
	year: number | null
}

function asRecord(value: unknown) {
	return typeof value === "object" && value !== null ? value as Record<string, unknown> : null
}

function getString(value: unknown) {
	return typeof value === "string" ? value : null
}

function getNumber(value: unknown) {
	return typeof value === "number" ? value : null
}

function getStringArray(value: unknown) {
	return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function getParsedProfile(candidate: { parsedProfile?: unknown }) {
	return asRecord(candidate.parsedProfile)
}

function getSkillsMatched(candidate: CandidateResult) {
	return getStringArray(candidate.skillsMatched)
}

function getEducationEntries(detail: CandidateResultDetail) {
	const education = getParsedProfile(detail)?.education
	if (!Array.isArray(education))
		return []

	return education
		.map((entry) => {
			const record = asRecord(entry)
			if (!record)
				return null

			return {
				degree: getString(record.degree),
				institution: getString(record.institution),
				year: getNumber(record.year),
			}
		})
		.filter((entry): entry is EducationItem => entry !== null)
}

export type RetryMode = "rerun_current" | "clone_current" | "clone_with_updates" | "replace_with_updates"

export type RetryFormValues = {
	name: string
	jobTitle: string
	jobDescription: string
}

export const retryModeCopy = {
	rerun_current: {
		label: "Retry now",
		description: "Rerun this exact session in place with the same resumes and the same screening brief.",
		buttonLabel: "Retry this session",
		requiresUpdates: false,
		target: "current" as const,
	},
	clone_current: {
		label: "New copy",
		description: "Create a new session using the same resumes and current brief while keeping this one intact.",
		buttonLabel: "Create new copied session",
		requiresUpdates: false,
		target: "new" as const,
	},
	clone_with_updates: {
		label: "Update as new",
		description: "Edit the brief, then create a new follow-up session with the same resumes.",
		buttonLabel: "Create updated session",
		requiresUpdates: true,
		target: "new" as const,
	},
	replace_with_updates: {
		label: "Update and replace",
		description: "Edit this session and rerun it in place, replacing the current result set.",
		buttonLabel: "Update and rerun",
		requiresUpdates: true,
		target: "current" as const,
	},
}

export function getDisplayCandidateName(candidate: CandidateResult) {
	const confidence = Number(getParsedProfile(candidate)?.name_confidence ?? 0)
	if (candidate.candidateName && confidence >= 0.5)
		return candidate.candidateName

	return candidate.originalName
}

export function needsManualReview(candidate: CandidateResult) {
	return getStringArray(getParsedProfile(candidate)?.parse_warnings).length > 0
}

export function getManualReviewLabel(candidate: CandidateResult) {
	const warnings = new Set(getStringArray(getParsedProfile(candidate)?.parse_warnings))
	if (warnings.has("name_missing_or_invalid"))
		return "Please verify the candidate name manually"
	if (warnings.has("work_history_not_confident"))
		return "Please double-check work history and experience"
	if (warnings.has("skills_not_confident"))
		return "Please confirm key skills from the resume"
	return "A manual review is recommended"
}

export function getExperienceLabel(candidate: { parsedProfile?: unknown }) {
	const years = getNumber(getParsedProfile(candidate)?.total_experience_years)
	if (years === null)
		return null

	return `${years} year${years === 1 ? "" : "s"} experience`
}

export function getPrimarySkills(candidate: CandidateResult) {
	const matched = getSkillsMatched(candidate)
	if (matched.length > 0)
		return matched.slice(0, 5)

	return getStringArray(getParsedProfile(candidate)?.skills).slice(0, 5)
}

export function getMissingSkills(detail: CandidateResultDetail) {
	const scoreBreakdown = asRecord(detail.scoreBreakdown)
	const skillMatch = asRecord(scoreBreakdown?.skill_match)
	const details = asRecord(skillMatch?.details)
	return getStringArray(details?.missing)
}

export function getRecentRoles(detail: CandidateResultDetail) {
	const workHistory = getParsedProfile(detail)?.work_history
	if (!Array.isArray(workHistory))
		return []

	return workHistory
		.map((entry) => {
			const record = asRecord(entry)
			if (!record)
				return null

			return {
				title: getString(record.title),
				company: getString(record.company),
				start_date: getString(record.start_date),
				end_date: getString(record.end_date),
				description: getString(record.description),
			} satisfies WorkHistoryItem
		})
		.filter((entry): entry is WorkHistoryItem => entry !== null)
		.slice(0, 3)
}

export function getEducationLines(detail: CandidateResultDetail) {
	return getEducationEntries(detail)
		.map((entry) => [entry.degree, entry.institution, entry.year].filter(Boolean).join(" � "))
		.filter(Boolean)
}

export function getCertifications(detail: CandidateResultDetail) {
	return getStringArray(getParsedProfile(detail)?.certifications)
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
