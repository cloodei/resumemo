"use client";

import Link from "next/link";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { ThemeToggler } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Redirect if no email provided
  useEffect(() => {
    if (!email) {
      toast.error("Missing email. Please sign up again.");
      router.replace("/login");
    }
  }, [email, router]);

  const handleResend = async () => {
    if (!email || cooldown > 0 || isSending) return;

    setIsSending(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (error) {
        toast.error(error.message ?? "Unable to send code");
        return;
      }

      toast.success("Verification code sent");
      setCooldown(60);
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length < 6) {
      toast.error("Enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    try {
      const { error } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      });

      if (error) {
        toast.error(error.message ?? "Incorrect code");
        return;
      }

      toast.success("Email verified! Welcome to Résumemo");
      router.push("/dashboard");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!email) {
    toast.error("Missing email. Please sign up again.");
    router.replace("/login");
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-100 dark:bg-background">
      <ThemeToggler className="absolute top-3 right-5" />

      <div className="w-full max-w-lg space-y-6">
        <Card className="relative bg-white dark:bg-card border-neutral-300 dark:border-accent overflow-hidden">
          <div className="absolute left-0 right-0 top-0 h-px bg-linear-to-r from-emerald-500/30 via-primary/40 to-rose-500/40" />

          <CardHeader className="pb-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <CardTitle className="text-center pt-3">Verify your email</CardTitle>
            <CardDescription className="text-center">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form className="space-y-4" onSubmit={handleVerify}>
              <div className="space-y-2">
                <Input
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="tracking-[0.4em] text-center text-xl h-12"
                  autoFocus
                />
              </div>

              <Button className="w-full" type="submit" disabled={isVerifying}>
                {isVerifying ? "Verifying..." : "Verify email"}
              </Button>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isSending || cooldown > 0}
                  onClick={handleResend}
                >
                  {isSending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </Button>
                <Button type="button" variant="ghost" className="flex-1" asChild>
                  <Link href="/login">
                    <ArrowLeft className="size-4 mr-2" />
                    Back to signup
                  </Link>
                </Button>
              </div>
            </form>
          </CardContent>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-rose-500/40 via-primary/40 to-emerald-500/30" />
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Didn't receive the email? Check your spam folder or{" "}
          <Link href="/support" className="text-primary hover:underline">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
