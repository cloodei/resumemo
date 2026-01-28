import cors from "@elysiajs/cors";
import { Elysia } from "elysia";
import { openapi } from "@elysiajs/openapi";
import { logger } from "@rasla/logify";

import { db } from "./lib/db";
import { auth } from "./lib/auth";
import * as schema from "./lib/schema";

const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });

        if (!session)
          return status(401, { message: "Unauthorized" });

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });

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
  .get("/api/clear", async () => {
    /**
     * TODO: Remove this endpoint
     * ONLY FOR DEVELOPMENT
     */
    const [numUsersDeleted, numSessionsDeleted, numAccountsDeleted, numVerificationsDeleted] = await Promise.all([
      db.delete(schema.user),
      db.delete(schema.session),
      db.delete(schema.account),
      db.delete(schema.verification),
    ]);
    return { status: "ok", numUsersDeleted, numSessionsDeleted, numAccountsDeleted, numVerificationsDeleted };
  })
  .listen({ hostname: "0.0.0.0", port: 8080 });

export type API = typeof app;

console.log(`🦊 Elysia is running at http://localhost:${app.server?.port}`);
