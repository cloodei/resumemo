import { Elysia, t } from "elysia"

import { apiEnv } from "~/config/env"
import { applyScreeningPipelineCallback } from "~/modules/screening/service"

export const screeningInternalRoutes = new Elysia({ prefix: "/api/internal/pipeline/v3" })
	.post(
		"/callback",
		async ({ body, headers, status }) => {
			const result = await applyScreeningPipelineCallback({
				body,
				secretHeader: headers[apiEnv.pipeline.secretHeaderName],
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			body: t.Any(),
		},
	)
