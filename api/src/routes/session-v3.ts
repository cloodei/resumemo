import { Elysia } from "elysia"

import * as profilingV3Schema from "~/schemas/session-v3"
import * as profilingV3Usecases from "~/usecases/profiling-v3"
import { authMiddleware } from "~/lib/auth"
import { presignSessionUploadsUsecase } from "~/usecases/session"

export const sessionV3Routes = new Elysia({ prefix: "/api/v3/sessions" })
	.use(authMiddleware)
	.post(
		"/presign",
		async ({ user, body, status }) => {
			const result = await presignSessionUploadsUsecase({
				userId: user.id,
				body,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			body: profilingV3Schema.presignSessionUploadsV3BodySchema,
		},
	)
	
	.post(
		"/create",
		async ({ user, body, status }) => {
			const result = await profilingV3Usecases.createSessionV3Usecase({
				userId: user.id,
				body,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			body: profilingV3Schema.createSessionV3BodySchema,
		},
	)

	.get(
		"/",
		async ({ user }) => {
			const result = await profilingV3Usecases.listSessionsV3Usecase({ userId: user.id })
			return result.data
		},
		{ auth: true },
	)

	.get(
		"/:id",
		async ({ user, params, status }) => {
			const result = await profilingV3Usecases.getSessionDetailV3Usecase({
				userId: user.id,
				sessionId: params.id,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{ auth: true },
	)

	.get(
		"/:id/results",
		async ({ user, params, query, status }) => {
			const result = await profilingV3Usecases.listSessionResultsV3Usecase({
				userId: user.id,
				sessionId: params.id,
				sort: query.sort,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			query: profilingV3Schema.sessionResultsV3QuerySchema,
		},
	)
	
	.get(
		"/:id/results/:resultId",
		async ({ user, params, status }) => {
			const result = await profilingV3Usecases.getSessionResultV3Usecase({
				userId: user.id,
				sessionId: params.id,
				resultId: params.resultId,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{ auth: true },
	)
