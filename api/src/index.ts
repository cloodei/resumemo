import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";


import { authMiddleware } from "./lib/auth";
import { CORS_BASE_ALLOWED_HEADERS, CORS_METHODS } from "./config/constants";
import { apiEnv } from "./config/env";
import { pipelineCallbackRoutes, sessionRoutes } from "./routes";

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
	.use(authMiddleware)
	.use(sessionRoutes)
	.use(pipelineCallbackRoutes)
	.listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;
