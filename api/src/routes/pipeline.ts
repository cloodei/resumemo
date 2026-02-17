/**
 * Internal pipeline callback endpoint.
 *
 * Receives progress, completion, and error callbacks from the Celery worker.
 * Authenticated by shared secret (PIPELINE_CALLBACK_SECRET), not user auth.
 */

import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";

import * as schema from "@shared/schemas";
import { db } from "~/lib/db";

const PIPELINE_CALLBACK_SECRET = process.env.PIPELINE_CALLBACK_SECRET ?? "";

/**
 * Validate the Bearer token from the Authorization header.
 */
function validateSecret(authHeader: string | null): boolean {
	if (!PIPELINE_CALLBACK_SECRET) {
		console.warn("[Pipeline Callback] PIPELINE_CALLBACK_SECRET is not set — rejecting all callbacks");
		return false;
	}
	if (!authHeader) return false;
	const token = authHeader.replace(/^Bearer\s+/i, "");
	return token === PIPELINE_CALLBACK_SECRET;
}

// ── Schemas for callback payloads ────────────────────────────────

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

const progressBody = t.Object({
	type: t.Literal("progress"),
	session_id: t.String(),
	job_id: t.String(),
	status: t.Literal("running"),
	processed_files: t.Number(),
	total_files: t.Number(),
	current_file: t.Nullable(t.String()),
});

const completionBody = t.Object({
	type: t.Literal("completion"),
	session_id: t.String(),
	job_id: t.String(),
	status: t.Literal("completed"),
	pipeline_version: t.String(),
	processed_files: t.Number(),
	total_files: t.Number(),
	results: t.Array(resultSchema),
});

const errorBody = t.Object({
	type: t.Literal("error"),
	session_id: t.String(),
	job_id: t.String(),
	status: t.Literal("failed"),
	error: t.String(),
	processed_files: t.Number(),
	total_files: t.Number(),
	partial_results: t.Array(resultSchema),
});

const callbackBody = t.Union([progressBody, completionBody, errorBody]);

// ── Route ────────────────────────────────────────────────────────

export const pipelineCallbackRoute = new Elysia({ prefix: "/api/internal/pipeline" })
	.post(
		"/callback",
		async ({ body, headers, status }) => {
			// Authenticate by shared secret
			const authHeader = headers.authorization ?? null;
			if (!validateSecret(authHeader)) {
				return status(401, { status: "error", message: "Unauthorized" });
			}

			const { type, session_id, job_id } = body;

			// Verify the pipeline job exists and isn't already finalized
			const [job] = await db
				.select()
				.from(schema.pipelineJob)
				.where(eq(schema.pipelineJob.id, job_id));

			if (!job) {
				return status(404, { status: "error", message: "Pipeline job not found" });
			}

			// Idempotency guard: if job is already completed or failed, acknowledge but skip
			if (job.status === "completed" || job.status === "failed") {
				console.log(`[Pipeline Callback] Job ${job_id} already ${job.status}, skipping ${type} callback`);
				return { status: "ok", skipped: true };
			}

			// Handle each callback type
			switch (type) {
				case "progress":
					await handleProgress(body, job_id);
					break;
				case "completion":
					await handleCompletion(body, job_id, session_id);
					break;
				case "error":
					await handleError(body, job_id, session_id);
					break;
			}

			return { status: "ok" };
		},
		{ body: callbackBody },
	);

// ── Handlers ─────────────────────────────────────────────────────

async function handleProgress(
	body: { processed_files: number; total_files: number },
	jobId: string,
) {
	await db
		.update(schema.pipelineJob)
		.set({
			status: "running",
			processedFiles: body.processed_files,
			startedAt: new Date(),
		})
		.where(eq(schema.pipelineJob.id, jobId));

	console.log(`[Pipeline Callback] Progress: ${body.processed_files}/${body.total_files} for job ${jobId}`);
}

async function handleCompletion(
	body: {
		pipeline_version: string;
		processed_files: number;
		results: Array<{
			file_id: number;
			candidate_name: string | null;
			candidate_email: string | null;
			candidate_phone: string | null;
			raw_text: string;
			parsed_profile: Record<string, unknown>;
			overall_score: number;
			score_breakdown: Record<string, unknown>;
			summary: string;
			skills_matched: string[];
		}>;
	},
	jobId: string,
	sessionId: string,
) {
	await db.transaction(async (tx) => {
		// Insert candidate results
		if (body.results.length > 0) {
			await tx.insert(schema.candidateResult).values(
				body.results.map((r) => ({
					sessionId,
					fileId: r.file_id,
					jobId,
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

		// Update pipeline job
		await tx
			.update(schema.pipelineJob)
			.set({
				status: "completed",
				processedFiles: body.processed_files,
				completedAt: new Date(),
			})
			.where(eq(schema.pipelineJob.id, jobId));

		// Update profiling session
		await tx
			.update(schema.profilingSession)
			.set({ status: "completed" })
			.where(eq(schema.profilingSession.id, sessionId));
	});

	console.log(`[Pipeline Callback] Completed: ${body.results.length} results for session ${sessionId}`);
}

async function handleError(
	body: {
		error: string;
		partial_results: Array<{
			file_id: number;
			candidate_name: string | null;
			candidate_email: string | null;
			candidate_phone: string | null;
			raw_text: string;
			parsed_profile: Record<string, unknown>;
			overall_score: number;
			score_breakdown: Record<string, unknown>;
			summary: string;
			skills_matched: string[];
		}>;
	},
	jobId: string,
	sessionId: string,
) {
	await db.transaction(async (tx) => {
		// Update pipeline job
		await tx
			.update(schema.pipelineJob)
			.set({
				status: "failed",
				errorMessage: body.error,
				completedAt: new Date(),
			})
			.where(eq(schema.pipelineJob.id, jobId));

		// Update profiling session
		await tx
			.update(schema.profilingSession)
			.set({
				status: "failed",
				errorMessage: body.error,
			})
			.where(eq(schema.profilingSession.id, sessionId));
	});

	console.log(`[Pipeline Callback] Failed: ${body.error} for session ${sessionId}`);
}
