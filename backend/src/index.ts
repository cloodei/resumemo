import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";

const app = new Elysia({ precompile: true })
  .use(openapi())
  .get("/", () => "Hello Elysia")
  .listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
