"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, ArrowLeft, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { ThemeToggler } from "@/components/theme-toggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "pending">(
    token ? "loading" : "pending"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!token) return;

    const verifyEmail = async () => {
      try {
        const { error } = await authClient.verifyEmail({ query: { token } });
        if (error) {
          setStatus("error");
          setErrorMessage(error.message ?? "Verification failed");
        } else {
          setStatus("success");
          // Redirect to dashboard after successful verification
          setTimeout(() => router.push("/dashboard"), 2000);
        }
      } catch {
        setStatus("error");
        setErrorMessage("An unexpected error occurred");
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendVerification = async () => {
    if (!email || isResending) return;
    
    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({ email });
      if (error) {
        setErrorMessage(error.message ?? "Failed to resend verification email");
      } else {
        setStatus("pending");
        setErrorMessage("");
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-100 dark:bg-background">
      <ThemeToggler className="absolute top-3 right-5" />

      <div className="w-full max-w-lg space-y-6">
        <Card className="relative bg-white dark:bg-card border-neutral-300 dark:border-accent overflow-hidden">
          <div className="absolute left-0 right-0 top-0 h-px bg-linear-to-r from-emerald-500/30 via-primary/40 to-rose-500/40" />

          <CardHeader className="pb-2">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary">
              {status === "loading" && <Loader2 className="size-6 animate-spin" />}
              {status === "success" && <CheckCircle className="size-6 text-emerald-500" />}
              {status === "error" && <XCircle className="size-6 text-rose-500" />}
              {status === "pending" && <Mail className="size-6" />}
            </div>
            <CardTitle className="text-center pt-3">
              {status === "loading" && "Verifying your email..."}
              {status === "success" && "Email verified!"}
              {status === "error" && "Verification failed"}
              {status === "pending" && "Check your inbox"}
            </CardTitle>
            <CardDescription className="text-center">
              {status === "loading" && "Please wait while we verify your email address."}
              {status === "success" && "Your email has been verified. Redirecting to dashboard..."}
              {status === "error" && (errorMessage || "The verification link may have expired or is invalid.")}
              {status === "pending" && (
                <>
                  We&apos;ve sent a verification link to{" "}
                  {email ? <span className="font-medium text-foreground">{email}</span> : "your email"}.
                  Click the link to verify your account.
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="flex flex-col gap-2 sm:flex-row">
              {(status === "error" || status === "pending") && email && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  disabled={isResending}
                  onClick={handleResendVerification}
                >
                  {isResending ? "Sending..." : "Resend verification email"}
                </Button>
              )}
              <Button type="button" variant="ghost" className="flex-1" asChild>
                <Link href="/login">
                  <ArrowLeft className="size-4 mr-2" />
                  Back to login
                </Link>
              </Button>
            </div>
          </CardContent>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-rose-500/40 via-primary/40 to-emerald-500/30" />
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <Link href="/support" className="text-primary hover:underline">
            contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
