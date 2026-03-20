/**
 * Internal pipeline callback endpoint.
 *
 * Receives completion and error callbacks from the Celery worker.
 * Authenticated by shared secret (PIPELINE_CALLBACK_SECRET), not user auth.
 */

import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

import * as schema from "@resumemo/core/schemas";

import { db } from "~/lib/db";
import { sessionRepository } from "~/repositories/session-repository";

const PIPELINE_CALLBACK_SECRET = process.env.PIPELINE_CALLBACK_SECRET ?? "";
const PIPELINE_SECRET_HEADER_NAME = (process.env.PIPELINE_SECRET_HEADER_NAME ?? "x-pipeline-secret").toLowerCase();

function validateSecret(secretHeader?: string | null) {
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
			const secretHeader = headers[PIPELINE_SECRET_HEADER_NAME];
			if (!validateSecret(secretHeader))
				return status(401, { status: "error", message: "Unauthorized" });

			const [session] = await db
				.select({
					id: schema.profilingSession.id,
					userId: schema.profilingSession.userId,
					status: schema.profilingSession.status,
					activeRunId: schema.profilingSession.activeRunId,
				})
				.from(schema.profilingSession)
				.where(eq(schema.profilingSession.id, body.session_id));

			if (!session)
				return status(404, { status: "error", message: "Session not found" });
			if (!session.activeRunId || session.activeRunId !== body.run_id)
				return { status: "ok", skipped: true };

			switch (body.type) {
				case "completion":
					await sessionRepository.applyPipelineCompletion({
						userId: session.userId,
						sessionId: body.session_id,
						runId: body.run_id,
						results: body.results,
					});
					break;
				case "error":
					await sessionRepository.applyPipelineError({
						userId: session.userId,
						sessionId: body.session_id,
						runId: body.run_id,
						error: body.error,
						partialResults: body.partial_results,
					});
					break;
			}

			return { status: "ok" };
		},
		{ body: callbackBody },
	);
