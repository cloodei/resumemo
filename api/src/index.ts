import openapi from "@elysiajs/openapi";
import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { apiEnv } from "./config/env";
import { authMiddleware } from "./lib/auth";
import { CORS_BASE_ALLOWED_HEADERS, CORS_METHODS } from "./config/constants";
import { jobDescriptionV3Routes, pipelineCallbackRoutes, pipelineCallbackV3Routes, sessionRoutes, sessionV3Routes } from "./routes";

const app = new Elysia({ precompile: true })
	.get("/health", () => ({ status: "ok" }))
	.use(
		cors({
			origin: apiEnv.server.frontendOrigins,
			methods: [...CORS_METHODS],
			credentials: true,
			allowedHeaders: [...CORS_BASE_ALLOWED_HEADERS, apiEnv.pipeline.secretHeaderName],
		}),
	)
	.use(openapi())
	.use(authMiddleware)
	.use(sessionRoutes)
	.use(sessionV3Routes)
	.use(jobDescriptionV3Routes)
	.use(pipelineCallbackRoutes)
	.use(pipelineCallbackV3Routes)
	.listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;
