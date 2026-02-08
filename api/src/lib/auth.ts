import { Elysia } from "elysia";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db";
import * as schema from "@shared/schemas";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  // baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:8080",
  // basePath: "/api/auth",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  advanced: {
    database: {
      generateId: "uuid"
    },
    // crossSubDomainCookies: {
    //   enabled: true
    // },
    // defaultCookieAttributes: {
    //   sameSite: "none",
    //   secure: process.env.NODE_ENV === "production"
    // }
  },
  trustedOrigins: [process.env.FRONTEND_URL ?? "http://localhost:5000"],
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

        if (!session) return status(401, { message: "Unauthorized" });

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
