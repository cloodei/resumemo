import { Elysia } from "elysia";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db";
import * as schema from "@resumemo/core/schemas";

const trustedOrigins = (process.env.FRONTEND_URLS
	?? process.env.FRONTEND_URL
	?? "http://localhost:5173,http://localhost:5000,http://localhost:3000")
	.split(",")
	.map(origin => origin.trim())
	.filter(Boolean);

const useCrossSiteCookies = process.env.AUTH_COOKIE_CROSS_SITE === "true";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8080",
  // basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  advanced: {
    database: {
      generateId: "uuid"
    },
    ...(useCrossSiteCookies
      ? {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        }
      : {}),
  },
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    maxPasswordLength: 128,
    minPasswordLength: 5,
  },
  // account: {
  //   allowAccountLinking: true,
  //   accountLinking: {
  //     enabled: true
  //   }
  // },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }
  },
  rateLimit: {
    enabled: true,
    window: 60,
  },
})

export const authMiddleware = new Elysia({ name: "auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const session = await auth.api.getSession({ headers });

        if (!session)
          return status(401, { status: "error", message: "Unauthorized" });

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
