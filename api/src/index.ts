import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";


import { authMiddleware } from "./lib/auth";
import { pipelineCallbackRoutes, sessionRoutes } from "./routes";

const frontendOrigins = (process.env.FRONTEND_URLS
	?? process.env.FRONTEND_URL
	?? "http://localhost:5000,http://localhost:3000,http://localhost:5173,http://localhost:5174")
	.split(",")
	.map(origin => origin.trim())
	.filter(Boolean);

const app = new Elysia({ precompile: true })
	.get("/health", () => ({ status: "ok" }))
	.use(
		cors({
			origin: frontendOrigins,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			credentials: true,
			allowedHeaders: ["Content-Type", "Authorization", process.env.PIPELINE_SECRET_HEADER_NAME ?? "x-pipeline-secret"],
		}),
	)
	.use(authMiddleware)
	.use(sessionRoutes)
	.use(pipelineCallbackRoutes)
	.listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🚀 Elysia is running at http://localhost:${app.server?.port}`);
