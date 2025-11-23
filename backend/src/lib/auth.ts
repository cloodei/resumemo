import { emailOTP } from "better-auth/plugins";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db, resend } from "./db";
import * as schema from "./schema";

const sendVerificationOTP = async ({ email, otp, type }: { email: string; otp: string; type: string }) => {
  const from = process.env.RESEND_FROM ?? "Resumemo Auth <no-reply@resumemo.app>";

  await resend.emails.send({
    from,
    to: [email],
    subject: type === "sign-in" ? "Your Résumemo sign-in code" : "Verify your Résumemo email",
    html: `
      <table style="width:100%;background:#05050f;padding:32px 0;font-family:Inter,system-ui,sans-serif;color:#f5f5ff;">
        <tr>
          <td align="center">
            <table style="max-width:520px;width:100%;background:#0f111a;border-radius:24px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
              <tr>
                <td style="text-transform:uppercase;letter-spacing:0.4em;font-size:11px;color:#a5b4fc;">Resumemo</td>
              </tr>
              <tr>
                <td style="font-size:24px;font-weight:600;padding-top:12px;">
                  ${type === "sign-in" ? "Magic code" : "Verify your email"}
                </td>
              </tr>
              <tr>
                <td style="opacity:0.8;padding-top:8px;font-size:15px;">Use the code below to ${
                  type === "sign-in" ? "sign in" : "verify your email"
                }.</td>
              </tr>
              <tr>
                <td style="padding:28px 0;">
                  <div style="font-size:36px;font-weight:700;letter-spacing:12px;color:#c4b5fd;">${otp}</div>
                </td>
              </tr>
              <tr>
                <td style="font-size:13px;opacity:0.65;">This code expires in 10 minutes. If you didn’t request it you can ignore this email.</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `,
  });
};

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
    requireEmailVerification: true,
    maxPasswordLength: 128,
    minPasswordLength: 5
  },
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
  plugins: [
    emailOTP({
      sendVerificationOTP,
      sendVerificationOnSignUp: true,
      allowedAttempts: 5,
    }),
  ],
  rateLimit: {
    enabled: true,
    window: 60,
  },
})
