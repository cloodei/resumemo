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
			escapeCsv(result.candidateEmail ?? ""),
			escapeCsv(result.candidatePhone ?? ""),
			String(result.overallScore),
			escapeCsv(stripMarkup(result.summary)),
			escapeCsv(Array.isArray(result.skillsMatched) ? result.skillsMatched.join("; ") : ""),
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
	const confidence = Number((parsedProfile as { name_confidence?: number } | null)?.name_confidence ?? 0)
	if (candidateName && confidence >= 0.5)
		return candidateName

	return originalName
}

function getExperienceLabel(parsedProfile: unknown) {
	const years = (parsedProfile as { total_experience_years?: number } | null)?.total_experience_years
	if (typeof years !== "number")
		return ""

	return `${years} year${years === 1 ? "" : "s"}`
}

function stripMarkup(value: string) {
	return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
