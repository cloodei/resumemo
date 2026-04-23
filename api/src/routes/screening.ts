import { Elysia, t } from "elysia"

import { authMiddleware } from "~/lib/auth"
import { presignSessionUploadsUsecase } from "~/usecases/session"
import {
	screeningCreateSessionBodySchema,
	screeningPresignBodySchema,
	screeningResultsQuerySchema,
} from "~/modules/screening/contracts"
import {
	createScreeningSession,
	getScreeningJobDescription,
	getScreeningResult,
	getScreeningSessionDetail,
	listScreeningJobDescriptions,
	listScreeningResults,
	listScreeningSessions,
} from "~/modules/screening/service"

export const screeningRoutes = new Elysia({ prefix: "/api/v3" })
	.use(authMiddleware)
	.post(
		"/sessions/presign",
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
			body: screeningPresignBodySchema,
		},
	)
	.post(
		"/sessions/create",
		async ({ user, body, status }) => {
			const result = await createScreeningSession({
				userId: user.id,
				body,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{
			auth: true,
			body: screeningCreateSessionBodySchema,
		},
	)
	.get(
		"/sessions",
		async ({ user, status }) => {
			const result = await listScreeningSessions(user.id)
			return result.data
		},
		{ auth: true },
	)
	.get(
		"/sessions/:id",
		async ({ user, params, status }) => {
			const result = await getScreeningSessionDetail(user.id, params.id)
			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)
			return result.data
		},
		{
			auth: true,
			params: t.Object({ id: t.String({ minLength: 1 }) }),
		},
	)
	.get(
		"/sessions/:id/results",
		async ({ user, params, query, status }) => {
			const result = await listScreeningResults({
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
			params: t.Object({ id: t.String({ minLength: 1 }) }),
			query: screeningResultsQuerySchema,
		},
	)
	.get(
		"/sessions/:id/results/:resultId",
		async ({ user, params, status }) => {
			const result = await getScreeningResult({
				userId: user.id,
				sessionId: params.id,
				resultId: params.resultId,
			})
			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)
			return result.data
		},
		{
			auth: true,
			params: t.Object({
				id: t.String({ minLength: 1 }),
				resultId: t.String({ minLength: 1 }),
			}),
		},
	)
	.get(
		"/job-descriptions/templates",
		async ({ user, status }) => {
			const result = await listScreeningJobDescriptions(user.id)
			return result.data
		},
		{ auth: true },
	)
	.get(
		"/job-descriptions/templates/:id",
		async ({ user, params, status }) => {
			const result = await getScreeningJobDescription(user.id, params.id)
			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)
			return result.data
		},
		{
			auth: true,
			params: t.Object({ id: t.String({ minLength: 1 }) }),
		},
	)
