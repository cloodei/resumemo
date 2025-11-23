"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { Eye, EyeOff, Mail, Lock, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { authClient } from "@/lib/auth"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { SocialButtons } from "./social-buttons"

const authTabs = [
  { value: "password", label: "Password" },
  { value: "otp", label: "Email code" },
]

type SignInFormValues = {
  email: string
  password: string
  rememberMe: boolean
  otpCode: string
}

export function SignInForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<"password" | "otp">("password")
  const [cooldown, setCooldown] = useState(0)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const form = useForm<SignInFormValues>({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
      otpCode: "",
    },
  })

  useEffect(() => {
    if (!cooldown) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      if (mode === "password") {
        const { error } = await authClient.signIn.email({
          email: values.email,
          password: values.password,
          callbackURL: "/dashboard",
          rememberMe: values.rememberMe,
        })

        if (error) {
          toast.error(error.message ?? "Unable to sign in right now")
          return
        }
      } else {
        if (!values.otpCode) {
          toast.error("Enter the code we emailed you")
          return
        }

        const { error } = await authClient.signIn.emailOtp({
          email: values.email,
          otp: values.otpCode,
        })

        if (error) {
          toast.error(error.message ?? "Incorrect code")
          return
        }
      }

      toast.success("Welcome back 👋")
      router.push("/dashboard")
    } finally {
      setIsSubmitting(false)
    }
  })

  const handleSendOtp = async () => {
    const email = form.getValues("email")
    if (!email) {
      toast.error("Enter your email first")
      return
    }

    setIsSendingCode(true)
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "sign-in",
      })

      if (error) {
        toast.error(error.message ?? "Unable to send code")
        return
      }

      toast.success("Magic code on the way ✉️")
      setCooldown(60)
    } finally {
      setIsSendingCode(false)
    }
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 p-1 text-xs">
          {authTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setMode(tab.value as typeof mode)}
              className={`flex-1 rounded-full px-3 py-2 font-medium transition-all ${
                mode === tab.value ? "bg-linear-to-r from-purple-500 to-indigo-500 text-white" : "text-muted-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    autoComplete="email"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === "password" ? (
          <>
            <FormField
              control={form.control}
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
                        autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="rememberMe"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">Remember me</FormLabel>
                  </FormItem>
                )}
              />
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign In"}
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <FormField
                control={form.control}
                name="otpCode"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>One-time code</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          placeholder="6-digit code"
                          className="tracking-[0.5em] text-center text-lg"
                          maxLength={6}
                          {...field}
                        />
                        <Zap className="pointer-events-none absolute right-3 top-1/2 hidden size-4 -translate-y-1/2 text-primary sm:block" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendOtp}
                disabled={isSendingCode || cooldown > 0}
                className="flex-1 border-dashed"
              >
                {isSendingCode ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Send code"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Secure, passwordless sign-in. Codes expire after a few minutes for your safety.
            </p>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Checking..." : "Continue with code"}
            </Button>
          </div>
        )}

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <SocialButtons />
      </form>
    </Form>
  )
}
