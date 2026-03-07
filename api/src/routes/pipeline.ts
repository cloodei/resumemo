/**
 * Internal pipeline callback endpoint.
 *
 * Receives completion and error callbacks from the Celery worker.
 * Authenticated by shared secret (PIPELINE_CALLBACK_SECRET), not user auth.
 */

import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";

import { db } from "~/lib/db";
import * as schema from "@shared/schemas";

const PIPELINE_CALLBACK_SECRET = process.env.PIPELINE_CALLBACK_SECRET ?? "";
const PIPELINE_SECRET_HEADER_NAME = process.env.PIPELINE_SECRET_HEADER_NAME ?? "x-pipeline-secret";

function getSecretHeaderValue(headers: Record<string, string | undefined>) {
	const headerName = PIPELINE_SECRET_HEADER_NAME.toLowerCase();
	return headers[headerName] ?? null;
}

function validateSecret(secretHeader: string | null) {
	if (!PIPELINE_CALLBACK_SECRET || !secretHeader)
		return false;

	return secretHeader === PIPELINE_CALLBACK_SECRET;
}

const resultSchema = t.Object({
	file_id: t.Number(),
	candidate_name: t.Nullable(t.String()),
	candidate_email: t.Nullable(t.String()),
	candidate_phone: t.Nullable(t.String()),
	raw_text: t.String(),
	parsed_profile: t.Record(t.String(), t.Any()),
	overall_score: t.Number(),
	score_breakdown: t.Record(t.String(), t.Any()),
	summary: t.String(),
	skills_matched: t.Array(t.String()),
});

const completionBody = t.Object({
	type: t.Literal("completion"),
	session_id: t.String(),
	status: t.Literal("completed"),
	pipeline_version: t.String(),
	results: t.Array(resultSchema),
});
type CompletionBody = typeof completionBody.static;

const errorBody = t.Object({
	type: t.Literal("error"),
	session_id: t.String(),
	status: t.Literal("failed"),
	error: t.String(),
	partial_results: t.Array(resultSchema),
});
type ErrorBody = typeof errorBody.static;

const callbackBody = t.Union([completionBody, errorBody]);

export const pipelineCallbackRoute = new Elysia({ prefix: "/api/internal/pipeline" })
	.post(
		"/callback",
		async ({ body, headers, status }) => {
			const secretHeader = getSecretHeaderValue(headers);
			if (!validateSecret(secretHeader))
				return status(401, { status: "error", message: "Unauthorized" });

			const { type, session_id } = body;

			// Verify the session exists
			const [session] = await db
				.select({ id: schema.profilingSession.id, status: schema.profilingSession.status })
				.from(schema.profilingSession)
				.where(eq(schema.profilingSession.id, session_id));

			if (!session)
				return status(404, { status: "error", message: "Session not found" });

			// Idempotency guard: if session is already finalized, acknowledge but skip
			if (session.status === "completed" || session.status === "failed") {
				console.log(`[Pipeline Callback] Session ${session_id} already ${session.status}, skipping ${type} callback`);
				return { status: "ok", skipped: true };
			}

			// Handle each callback type
			switch (type) {
				case "completion":
					await handleCompletion(body, session_id);
					break;
				case "error":
					await handleError(body, session_id);
					break;
			}

			return { status: "ok" };
		},
		{ body: callbackBody },
	);

async function handleCompletion(
	body: CompletionBody,
	sessionId: string,
) {
	await db.transaction(async (tx) => {
		const promise = tx
			.update(schema.profilingSession)
			.set({ status: "completed" })
			.where(eq(schema.profilingSession.id, sessionId))
			.catch((error) => console.error(`[Pipeline Callback] Failed to update session ${sessionId}:`, error));

		if (body.results.length > 0) {
			await tx.insert(schema.candidateResult).values(
				body.results.map((r) => ({
					sessionId,
					fileId: r.file_id,
					candidateName: r.candidate_name,
					candidateEmail: r.candidate_email,
					candidatePhone: r.candidate_phone,
					rawText: r.raw_text,
					parsedProfile: r.parsed_profile,
					overallScore: String(r.overall_score),
					scoreBreakdown: r.score_breakdown,
					summary: r.summary,
					skillsMatched: r.skills_matched,
					pipelineVersion: body.pipeline_version,
				})),
			);
		}

		await promise;
	});

	console.log(`[Pipeline Callback] Completed: ${body.results.length} results for session ${sessionId}`);
}

async function handleError(
	body: ErrorBody,
	sessionId: string,
) {
	await db.transaction(async (tx) => {
		const promise = tx
			.update(schema.profilingSession)
			.set({
				status: "failed",
				errorMessage: body.error
			})
			.where(eq(schema.profilingSession.id, sessionId))
			.catch((error) => console.error(`[Pipeline Callback] Failed to update session ${sessionId}:`, error));

		if (body.partial_results.length > 0) {
			await tx.insert(schema.candidateResult).values(
				body.partial_results.map((r) => ({
					sessionId,
					fileId: r.file_id,
					candidateName: r.candidate_name,
					candidateEmail: r.candidate_email,
					candidatePhone: r.candidate_phone,
					rawText: r.raw_text,
					parsedProfile: r.parsed_profile,
					overallScore: String(r.overall_score),
					scoreBreakdown: r.score_breakdown,
					summary: r.summary,
					skillsMatched: r.skills_matched,
					pipelineVersion: "unknown",
				})),
			);
		}

		await promise;
	});

	console.log(
		`[Pipeline Callback] Failed: ${body.error} for session ${sessionId} (${body.partial_results.length} partial results saved)`,
	);
}
