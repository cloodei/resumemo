import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";

import { auth } from "./lib/auth";

const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });

        if (!session)
          return status(401);

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

const app = new Elysia({ precompile: true })
  // .use(
  //   cors({
  //     origin: process.env.FRONTEND_URL ?? "http://localhost:5000",
  //     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  //     credentials: true,
  //     allowedHeaders: ["Content-Type", "Authorization"],
  //   }),
  // )
  .use(openapi())
  .use(betterAuth)
  .get("/", () => ({ status: "ok" }))
  .get(
    "/api/me",
    ({ user, session }) => ({
      user,
      session,
    }),
    { auth: true },
  )
  .listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
