import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";

import { apiEnv } from "./config/env";
import { authMiddleware } from "./lib/auth";
import { pipelineCallbackRoutes, sessionRoutes } from "./routes";
import { CORS_BASE_ALLOWED_HEADERS, CORS_METHODS } from "./config/constants";

const app = new Elysia({ precompile: true, name: "API" })
	// .use(openapi())
	// .use(logixlysia({
	// 	config: {
	// 		showStartupMessage: true,
	// 		showContextTree: true,
	// 		contextDepth: 2,
	// 		startupMessageFormat: "banner",
	// 		timestamp: {
	// 			translateTime: 'yyyy-mm-dd HH:MM:ss.SSS'
	// 		}
	// 	}
	// }))
	.get("/", () => apiEnv.jwt.secret)
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
	// .listen({ hostname: "0.0.0.0", port: 8080 });
	.listen({ port: 8080 });

export type API = typeof app;
