import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db } from "./db";
import * as schema from "./schema";

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema
  }),
  advanced: {
    database: {
      generateId: "uuid"
    }
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
