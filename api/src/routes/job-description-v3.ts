import { Elysia } from "elysia"

import { authMiddleware } from "~/lib/auth"
import * as profilingV3Usecases from "~/usecases/profiling-v3"

export const jobDescriptionV3Routes = new Elysia({ prefix: "/api/v3/job-descriptions" })
	.use(authMiddleware)
	.get(
		"/templates",
		async ({ user }) => {
			const result = await profilingV3Usecases.listJobDescriptionTemplatesV3Usecase({ userId: user.id })
			return result.data
		},
		{ auth: true },
	)
	.get(
		"/templates/:id",
		async ({ user, params, status }) => {
			const result = await profilingV3Usecases.getJobDescriptionTemplateV3Usecase({
				userId: user.id,
				jobDescriptionId: params.id,
			})

			if (!result.ok)
				return status(result.error.httpStatus, result.error.body)

			return result.data
		},
		{ auth: true },
	)
