import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";

const app = new Elysia({ precompile: true })
  .use(openapi())
  .get("/", () => "Hello Elysia")
  .listen({ hostname: "0.0.0.0", port: 3000 });

console.log(`🦊 Elysia is running at http://${app.server?.hostname}:${app.server?.port}`);
