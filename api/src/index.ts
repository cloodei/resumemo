import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { logger } from "@rasla/logify";
import { openapi } from "@elysiajs/openapi";

import { fileRoutes } from "./routes/files";
import { systemRoutes } from "./routes/system";
import { sessionRoutes } from "./routes/sessions";
import { pipelineCallbackRoute } from "./routes/pipeline";
// import { randomRoutes } from "./routes/random";
import { authMiddleware } from "./lib/auth";

const app = new Elysia({ precompile: true })
	.use(
		cors({
			// origin: process.env.FRONTEND_URL ?? "http://localhost:5000",
			origin: true,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			credentials: true,
			allowedHeaders: ["Content-Type", "Authorization"],
		}),
	)
	.use(logger())
	.use(openapi())
	.use(authMiddleware)
	.use(systemRoutes)
	.use(sessionRoutes)
	.use(fileRoutes)
	.use(pipelineCallbackRoute)
	// .use(randomRoutes)
	.listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🚀 Elysia is running at http://localhost:${app.server?.port}`);
