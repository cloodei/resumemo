/**
 * Internal pipeline callback endpoint.
 *
 * Receives completion and error callbacks from the Celery worker.
 * Authenticated by shared secret (PIPELINE_CALLBACK_SECRET), not user auth.
 */

import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import * as schema from "@shared/schemas";

import { db } from "~/lib/db";

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
	run_id: t.String(),
	status: t.Literal("completed"),
	pipeline_version: t.String(),
	results: t.Array(resultSchema),
});
type CompletionBody = typeof completionBody.static;

const errorBody = t.Object({
	type: t.Literal("error"),
	session_id: t.String(),
	run_id: t.String(),
	status: t.Literal("failed"),
	error: t.String(),
	partial_results: t.Array(resultSchema),
});
type ErrorBody = typeof errorBody.static;

const callbackBody = t.Union([completionBody, errorBody]);

export const pipelineCallbackRoutes = new Elysia({ prefix: "/api/internal/pipeline" })
	.post(
		"/callback",
		async ({ body, headers, status }) => {
			const secretHeader = getSecretHeaderValue(headers);
			if (!validateSecret(secretHeader))
				return status(401, { status: "error", message: "Unauthorized" });

			const [session] = await db
				.select({
					id: schema.profilingSession.id,
					status: schema.profilingSession.status,
					activeRunId: schema.profilingSession.activeRunId,
				})
				.from(schema.profilingSession)
				.where(eq(schema.profilingSession.id, body.session_id));

			if (!session)
				return status(404, { status: "error", message: "Session not found" });

			if (!session.activeRunId || session.activeRunId !== body.run_id) {
				console.log(`[Pipeline Callback] Session ${body.session_id} received stale callback for run ${body.run_id}`);
				return { status: "ok", skipped: true };
			}

			switch (body.type) {
				case "completion":
					await handleCompletion(body);
					break;
				case "error":
					await handleError(body);
					break;
			}

			return { status: "ok" };
		},
		{ body: callbackBody },
	);

async function handleCompletion(body: CompletionBody) {
	await db.transaction(async (tx) => {
		await tx
			.delete(schema.candidateResult)
			.where(
				and(
					eq(schema.candidateResult.sessionId, body.session_id),
					eq(schema.candidateResult.runId, body.run_id),
				),
			);

		await tx
			.update(schema.profilingSession)
			.set({
				status: "completed",
				errorMessage: null,
				pipelineVersion: body.pipeline_version,
				lastCompletedAt: new Date(),
			})
			.where(
				and(
					eq(schema.profilingSession.id, body.session_id),
					eq(schema.profilingSession.activeRunId, body.run_id),
				),
			);

		if (body.results.length === 0)
			return;

		await tx.insert(schema.candidateResult).values(
			body.results.map(result => ({
				sessionId: body.session_id,
				runId: body.run_id,
				fileId: result.file_id,
				candidateName: result.candidate_name,
				candidateEmail: result.candidate_email,
				candidatePhone: result.candidate_phone,
				rawText: result.raw_text,
				parsedProfile: result.parsed_profile,
				overallScore: String(result.overall_score),
				scoreBreakdown: result.score_breakdown,
				summary: result.summary,
				skillsMatched: result.skills_matched,
				pipelineVersion: body.pipeline_version,
			})),
		);
	});

	console.log(`[Pipeline Callback] Completed run ${body.run_id} for session ${body.session_id}`);
}

async function handleError(body: ErrorBody) {
	await db.transaction(async (tx) => {
		await tx
			.delete(schema.candidateResult)
			.where(
				and(
					eq(schema.candidateResult.sessionId, body.session_id),
					eq(schema.candidateResult.runId, body.run_id),
				),
			);

		await tx
			.update(schema.profilingSession)
			.set({
				status: "failed",
				errorMessage: body.error,
				lastCompletedAt: null,
			})
			.where(
				and(
					eq(schema.profilingSession.id, body.session_id),
					eq(schema.profilingSession.activeRunId, body.run_id),
				),
			);

		if (body.partial_results.length === 0)
			return;

		await tx.insert(schema.candidateResult).values(
			body.partial_results.map(result => ({
				sessionId: body.session_id,
				runId: body.run_id,
				fileId: result.file_id,
				candidateName: result.candidate_name,
				candidateEmail: result.candidate_email,
				candidatePhone: result.candidate_phone,
				rawText: result.raw_text,
				parsedProfile: result.parsed_profile,
				overallScore: String(result.overall_score),
				scoreBreakdown: result.score_breakdown,
				summary: result.summary,
				skillsMatched: result.skills_matched,
				pipelineVersion: "unknown",
			})),
		);
	});

	console.log(`[Pipeline Callback] Failed run ${body.run_id} for session ${body.session_id}: ${body.error}`);
}
