"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { SocialButtons } from "./social-buttons";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const detailsSchema = z
  .object({
    name: z.string().min(2, "Tell us your name"),
    email: z.email("Use a valid email"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match",
  });

const otpSchema = z.object({
  otp: z.string().min(6, "Enter the 6-digit code"),
});

type DetailsFormValues = z.infer<typeof detailsSchema>;
type OtpFormValues = z.infer<typeof otpSchema>;

export function SignUpForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [pendingAccount, setPendingAccount] = useState<DetailsFormValues | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  const detailsForm = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const otpForm = useForm<OtpFormValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (!cooldown) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const issueOtp = async (email: string) => {
    setIsSendingOtp(true);
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      });

      if (error) {
        toast.error(error.message ?? "Unable to send code");
        return false;
      }

      toast.success("Verification code sent ");
      setCooldown(60);
      return true;
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleDetailsSubmit = detailsForm.handleSubmit(async (values) => {
    const sent = await issueOtp(values.email);
    if (!sent)
      return;

    setPendingAccount(values);
    otpForm.reset({ otp: "" });
    setStep("otp");
  });

  const handleOtpSubmit = otpForm.handleSubmit(async ({ otp }) => {
    if (!pendingAccount) {
      toast.error("Re-enter your info to continue");
      setStep("details");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const { error: verificationError } = await authClient.emailOtp.verifyEmail({
        email: pendingAccount.email,
        otp,
      });

      if (verificationError) {
        toast.error(verificationError.message ?? "Incorrect code");
        return;
      }

      const { error } = await authClient.signUp.email({
        name: pendingAccount.name,
        email: pendingAccount.email,
        password: pendingAccount.password,
        callbackURL: "/dashboard",
      });

      if (error) {
        toast.error(error.message ?? "Unable to create account");
        return;
      }

      toast.success("Welcome to Résumemo ");
      router.push("/dashboard");
    } finally {
      setIsVerifyingOtp(false);
    }
  });

  const handleResend = async () => {
    if (!pendingAccount || cooldown > 0 || isSendingOtp) return;
    await issueOtp(pendingAccount.email);
  };

  const handleEditInfo = () => {
    setStep("details");
    setPendingAccount(null);
    otpForm.reset({ otp: "" });
  };

  if (step === "details") {
    return (
      <Form {...detailsForm}>
        <form className="space-y-4" onSubmit={handleDetailsSubmit}>
          <FormField
            control={detailsForm.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="John Doe" className="pl-10" autoComplete="name" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={detailsForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input type="email" placeholder="you@example.com" className="pl-10" autoComplete="email" {...field} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={detailsForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={detailsForm.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-10 pr-10"
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <Button
            className="w-full"
            type="submit"
            disabled={detailsForm.formState.isSubmitting || isSendingOtp}
          >
            {detailsForm.formState.isSubmitting || isSendingOtp ? "Sending code..." : "Continue with email"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t dark:border-neutral-300/80 border-neutral-700/50" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase">
              <span className="bg-background rounded-sm px-[6px] text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <SocialButtons />
        </form>
      </Form>
    );
  }

  return (
    <Form {...otpForm}>
      <form className="space-y-6" onSubmit={handleOtpSubmit}>
        <div className="rounded-2xl border border-white/10 bg-black/10 p-4">
          <div className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Email verification
            </span>
            <span className="text-xs text-muted-foreground">{pendingAccount?.email}</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter the 6-digit code we sent to your inbox. You can resend the code or edit your information if needed.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-dashed"
              disabled={isSendingOtp || cooldown > 0}
              onClick={handleResend}
            >
              {isSendingOtp ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>
            <Button type="button" variant="ghost" className="flex-1" onClick={handleEditInfo}>
              Edit information
            </Button>
          </div>
        </div>

        <FormField
          control={otpForm.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel>One-time code</FormLabel>
              <FormControl>
                <Input
                  placeholder="123456"
                  inputMode="numeric"
                  maxLength={6}
                  className="tracking-[0.4em] text-center text-lg"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button className="w-full" type="submit" disabled={isVerifyingOtp}>
          {isVerifyingOtp ? "Verifying..." : "Create account"}
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t dark:border-neutral-300/80 border-neutral-700/50" />
          </div>
          <div className="relative flex justify-center text-[11px] uppercase">
            <span className="bg-background rounded-sm px-[6px] text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <SocialButtons />
      </form>
    </Form>
  );
}
