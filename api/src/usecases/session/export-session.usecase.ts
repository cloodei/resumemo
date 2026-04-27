import { sessionRepository } from "~/repositories/session-repository"

import type { SessionExportQuery } from "~/schemas/session"
import { usecaseFailure, usecaseSuccess } from "../result"

const headers = [
	"Rank",
	"Candidate",
	"Email",
	"Phone",
	"Match Score",
	"Summary",
	"Top Skills",
	"Experience",
	"Resume File",
]
const csvHeaders = headers.join(",")

export async function exportSessionUsecase(input: {
	userId: string
	sessionId: string
	query: SessionExportQuery
}) {
	const session = await sessionRepository.getOwnedSessionById(input.userId, input.sessionId)
	if (!session) {
		return usecaseFailure(404, {
			status: "error",
			message: "Session not found",
		})
	}

	if (session.status !== "completed") {
		return usecaseFailure(409, {
			status: "error",
			message: "Session is not completed yet",
		})
	}

	const filteredResults = await sessionRepository.listSessionResults(input.sessionId, "desc", session.activeRunId ?? null)
	if (filteredResults === null)
		return usecaseFailure(404, { status: "error", message: "Results not found" })

	const format = input.query.format ?? "json"
	if (format === "csv") {
		const csvRows = filteredResults.map((result, index) => [
			String(index + 1),
			escapeCsv(buildDisplayName(result.candidateName, result.originalName, result.parsedProfile)),
			escapeCsv(getProfileContact(result.candidateEmail, result.parsedProfile, "email")),
			escapeCsv(getProfileContact(result.candidatePhone, result.parsedProfile, "phone")),
			String(result.overallScore),
			escapeCsv(stripMarkup(result.summary)),
			escapeCsv(getTopSkills(result.skillsMatched, result.parsedProfile)),
			escapeCsv(getExperienceLabel(result.parsedProfile)),
			escapeCsv(result.originalName),
		].join(","))

		const csv = [csvHeaders, ...csvRows].join("\n")
		const safeName = session.name.replace(/[^a-zA-Z0-9_-]/g, "_")

		return usecaseSuccess(csv, {
			"content-type": "text/csv; charset=utf-8",
			"content-disposition": `attachment; filename="${safeName}-results.csv"`,
		})
	}

	return usecaseSuccess({
		sessionId: session.id,
		sessionName: session.name,
		exportedAt: new Date().toISOString(),
		totalResults: filteredResults.length,
		results: filteredResults.map((result, index) => ({
			rank: index + 1,
			...result,
		})),
	})
}

function escapeCsv(value: string) {
	if (value.includes(",") || value.includes('"') || value.includes("\n"))
		return `"${value.replace(/"/g, '""')}"`

	return value
}

function buildDisplayName(candidateName: string | null, originalName: string, parsedProfile: unknown) {
	const confidence = Number((parsedProfile as { name_confidence?: number } | null)?.name_confidence ?? 1)
	if (candidateName && confidence >= 0.5)
		return candidateName

	const profile = typeof parsedProfile === "object" && parsedProfile !== null
		? parsedProfile as { information?: { name?: unknown } }
		: null
	if (typeof profile?.information?.name === "string" && profile.information.name)
		return profile.information.name

	return originalName
}

function getExperienceLabel(parsedProfile: unknown) {
	const profile = typeof parsedProfile === "object" && parsedProfile !== null
		? parsedProfile as { information?: { years_of_experience?: unknown }; total_experience_years?: unknown }
		: null
	const years = profile?.information?.years_of_experience ?? profile?.total_experience_years
	if (typeof years !== "number")
		return ""

	return `${years} year${years === 1 ? "" : "s"}`
}

function getTopSkills(skillsMatched: unknown, parsedProfile: unknown) {
	if (Array.isArray(skillsMatched) && skillsMatched.length > 0)
		return skillsMatched.filter((skill): skill is string => typeof skill === "string").join("; ")

	const profile = typeof parsedProfile === "object" && parsedProfile !== null
		? parsedProfile as { hard_skills?: { direct_mention?: unknown }; skills?: unknown }
		: null
	const directMentions = profile?.hard_skills?.direct_mention
	if (Array.isArray(directMentions)) {
		return directMentions
			.map((entry) => {
				if (typeof entry === "string")
					return entry
				if (typeof entry !== "object" || entry === null)
					return null

				const record = entry as { canonical_name?: unknown; skill?: unknown }
				return typeof record.canonical_name === "string"
					? record.canonical_name
					: typeof record.skill === "string" ? record.skill : null
			})
			.filter((skill): skill is string => Boolean(skill))
			.slice(0, 8)
			.join("; ")
	}

	return Array.isArray(profile?.skills)
		? profile.skills.filter((skill): skill is string => typeof skill === "string").slice(0, 8).join("; ")
		: ""
}

function getProfileContact(value: string | null, parsedProfile: unknown, key: "email" | "phone") {
	if (value)
		return value

	const profile = typeof parsedProfile === "object" && parsedProfile !== null
		? parsedProfile as { information?: Record<string, unknown> }
		: null
	const profileValue = profile?.information?.[key]
	return typeof profileValue === "string" ? profileValue : ""
}

function stripMarkup(value: string) {
	return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
