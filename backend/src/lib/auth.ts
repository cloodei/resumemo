import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";

import { db } from "./db";
import * as schema from "./schema";

const sendVerificationOTP = async ({ email, otp, type }: { email: string; otp: string; type: string }) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "no-reply@resumemo.app";

  if (!apiKey) {
    console.warn("[Better-Auth][OTP] RESEND_API_KEY missing. Logging OTP for debugging only.");
    console.info(`[OTP:${type}] ${otp} -> ${email}`);
    return;
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: type === "sign-in" ? "Your Résumemo sign-in code" : "Your Résumemo verification code",
      html: `
        <div style="font-family:Inter,system-ui,sans-serif;padding:24px;background:#05050f;color:#f5f5ff;">
          <p style="opacity:.8;">Use the code below to ${type === "sign-in" ? "sign in" : "verify your email"}.</p>
          <p style="font-size:32px;font-weight:600;letter-spacing:8px;margin:24px 0;color:#7c3aed;">${otp}</p>
          <p style="font-size:13px;opacity:.65;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
        </div>
      `,
    }),
  });
};

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
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
    }),
  ],
})
