/**
 * Internal pipeline callback endpoint.
 *
 * Receives completion and error callbacks from the Celery worker.
 * Authenticated by shared secret (PIPELINE_CALLBACK_SECRET), not user auth.
 */

import { Elysia } from "elysia"

import {
	getPipelineSecretHeader,
	pipelineCallbackBodySchema,
	pipelineCallbackUsecase,
} from "~/usecases/pipeline"

const PIPELINE_SECRET_HEADER_NAME = getPipelineSecretHeader()

export const pipelineCallbackRoutes = new Elysia({ prefix: "/api/internal/pipeline" })
	.post(
		"/callback",
		async ({ body, headers, status }) => {
			const result = await pipelineCallbackUsecase({
				body,
				secretHeader: headers[PIPELINE_SECRET_HEADER_NAME],
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{ body: pipelineCallbackBodySchema },
	)
