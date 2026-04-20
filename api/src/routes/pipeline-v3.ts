import { Elysia } from "elysia"

import { apiEnv } from "~/config/env"
import { pipelineCallbackV3Usecase } from "~/usecases/profiling-v3"
import { pipelineV3CallbackBodySchema } from "~/schemas/pipeline-v3"

export const pipelineCallbackV3Routes = new Elysia({ prefix: "/api/internal/pipeline/v3" })
	.post(
		"/callback",
		async ({ body, headers, status }) => {
			const result = await pipelineCallbackV3Usecase({
				body,
				secretHeader: headers[apiEnv.pipeline.secretHeaderName],
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			body: pipelineV3CallbackBodySchema,
		},
	)
