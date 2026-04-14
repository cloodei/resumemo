import { Elysia } from "elysia";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db";
import * as schema from "@resumemo/core/schemas";
import { apiEnv } from "~/config/env";

export const auth = betterAuth({
  secret: apiEnv.auth.secret,
  baseURL: apiEnv.auth.baseUrl,
  // basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  advanced: {
    database: {
      generateId: "uuid"
    },
    ...(apiEnv.auth.useCrossSiteCookies
      ? {
          defaultCookieAttributes: {
            sameSite: "none" as const,
            secure: true,
          },
        }
      : {}),
  },
  trustedOrigins: apiEnv.server.frontendOrigins,
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
      clientId: apiEnv.auth.googleClientId,
      clientSecret: apiEnv.auth.googleClientSecret,
    },
    github: {
      clientId: apiEnv.auth.githubClientId,
      clientSecret: apiEnv.auth.githubClientSecret,
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
          return status(401, { status: "error", message: "Unauthorized" } as const);

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
