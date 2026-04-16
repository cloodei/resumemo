import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { apiEnv } from "./config/env";
import { authMiddleware } from "./lib/auth";
import { pipelineCallbackRoutes, sessionRoutes } from "./routes";
import { CORS_BASE_ALLOWED_HEADERS, CORS_METHODS } from "./config/constants";
import openapi from "@elysiajs/openapi";

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
	.use(pipelineCallbackRoutes)
	.listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;
