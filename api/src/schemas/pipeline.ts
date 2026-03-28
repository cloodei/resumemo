import { t } from "elysia"

export const pipelineResultSchema = t.Object({
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
})

export const pipelineCompletionBodySchema = t.Object({
	type: t.Literal("completion"),
	session_id: t.String(),
	run_id: t.String(),
	status: t.Literal("completed"),
	results: t.Array(pipelineResultSchema),
})

export const pipelineErrorBodySchema = t.Object({
	type: t.Literal("error"),
	session_id: t.String(),
	run_id: t.String(),
	status: t.Literal("failed"),
	error: t.String(),
	partial_results: t.Array(pipelineResultSchema),
})

export const pipelineCallbackBodySchema = t.Union([
	pipelineCompletionBodySchema,
	pipelineErrorBodySchema,
])

export type PipelineCallbackBody = typeof pipelineCallbackBodySchema.static
