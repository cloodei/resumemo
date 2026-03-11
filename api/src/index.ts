import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { logger } from "@rasla/logify";
import { openapi } from "@elysiajs/openapi";

import * as routes from "./routes";
import { authMiddleware } from "./lib/auth";

const app = new Elysia({ precompile: true })
	.use(
		cors({
			origin: [
				process.env.FRONTEND_URL ?? "http://localhost:5000",
				"http://localhost:3000",
				"http://localhost:5173",
				"http://localhost:5174"
			],
			// origin: true,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			credentials: true,
			allowedHeaders: ["Content-Type", "Authorization", process.env.PIPELINE_SECRET_HEADER_NAME ?? "x-pipeline-secret"],
		}),
	)
	// .use(logger())
	// .use(openapi())
	.use(authMiddleware)
	.use(routes.sessionRoutes)
	.use(routes.pipelineCallbackRoutes)
	.listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🚀 Elysia is running at http://localhost:${app.server?.port}`);
