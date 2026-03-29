import { Elysia } from "elysia"

import { authMiddleware } from "~/lib/auth"
import * as sessionUsecases from "~/usecases/session"
import * as sessionSchema from "~/schemas/session"

export const sessionRoutes = new Elysia({ prefix: "/api/v2/sessions" })
	.use(authMiddleware)
	.post(
		"/presign",
		async ({ user, body, status }) => {
			const result = await sessionUsecases.presignSessionUploadsUsecase({
				userId: user.id,
				body,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			body: sessionSchema.presignSessionUploadsBodySchema,
		},
	)

	.post(
		"/create",
		async ({ user, body, status }) => {
			const result = await sessionUsecases.createSessionUsecase({
				userId: user.id,
				body,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			body: sessionSchema.createSessionBodySchema,
		},
	)

	.post(
		"/:id/retry",
		async ({ user, params, body, status }) => {
			const result = await sessionUsecases.retrySessionUsecase({
				userId: user.id,
				sessionId: params.id,
				body,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			body: sessionSchema.retrySessionBodySchema,
		},
	)

	.get(
		"/",
		async ({ user, status }) => {
			const result = await sessionUsecases.listSessionsUsecase({ userId: user.id })
			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{ auth: true },
	)

	.get(
		"/:id",
		async ({ user, params, status }) => {
			const result = await sessionUsecases.getSessionDetailUsecase({
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
		async ({ user, params, status, query }) => {
			const result = await sessionUsecases.listSessionResultsUsecase({
				userId: user.id,
				sessionId: params.id,
				sort: query.sort === "asc" ? "asc" : "desc",
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			query: sessionSchema.sessionResultsQuerySchema,
		},
	)

	.get(
		"/:id/results/:resultId",
		async ({ user, params, status }) => {
			const result = await sessionUsecases.getSessionResultUsecase({
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

	.get(
		"/:id/files/:fileId/access",
		async ({ user, params, query, status }) => {
			const result = await sessionUsecases.getSessionFileAccessUsecase({
				userId: user.id,
				sessionId: params.id,
				fileId: params.fileId,
				disposition: query.disposition,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			params: sessionSchema.sessionFileAccessParamsSchema,
			query: sessionSchema.sessionFileAccessQuerySchema,
		},
	)

	.get(
		"/:id/export",
		async ({ user, params, query, status, set }) => {
			const result = await sessionUsecases.exportSessionUsecase({
				userId: user.id,
				sessionId: params.id,
				query,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			for (const [key, value] of Object.entries(result.headers ?? {}))
				set.headers[key] = value

			return result.data
		},
		{
			auth: true,
			query: sessionSchema.sessionExportQuerySchema,
		},
	)
