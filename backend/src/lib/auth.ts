import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

import { db, resend } from "./db";
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
    requireEmailVerification: true,
    maxPasswordLength: 128,
    minPasswordLength: 5,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      const from = process.env.RESEND_FROM ?? "Resumemo Auth <no-reply@resumemo.app>";
      console.log("SENDING VERIFICATION EMAIL TO:", user.email, "\nURL:", url);

      await resend.emails.send({
        from,
        to: user.email,
        subject: "Verify your Résumemo email",
        html: `
          <table style="width:100%;background:#05050f;padding:32px 0;font-family:Inter,system-ui,sans-serif;color:#f5f5ff;">
            <tr>
              <td align="center">
                <table style="max-width:520px;width:100%;background:#0f111a;border-radius:24px;padding:32px;border:1px solid rgba(255,255,255,0.08);">
                  <tr>
                    <td style="text-transform:uppercase;letter-spacing:0.4em;font-size:11px;color:#a5b4fc;">Resumemo</td>
                  </tr>
                  <tr>
                    <td style="font-size:24px;font-weight:600;padding-top:12px;">Verify your email</td>
                  </tr>
                  <tr>
                    <td style="opacity:0.8;padding-top:8px;font-size:15px;">Click the button below to verify your email and get started.</td>
                  </tr>
                  <tr>
                    <td style="padding:28px 0;">
                      <a href="${url}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#8b5cf6,#6366f1);color:#fff;font-weight:600;text-decoration:none;border-radius:12px;font-size:16px;">Verify Email</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;opacity:0.65;">This link expires in 24 hours. If you didn't request it you can ignore this email.</td>
                  </tr>
                  <tr>
                    <td style="font-size:12px;opacity:0.5;padding-top:16px;word-break:break-all;">Or copy this link: ${url}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `,
      });
    },
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
