"use client"

import Link from "next/link"
import { FormEvent, useEffect, useState } from "react"
import { Eye, EyeOff, Mail, Lock, Github, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { authClient } from "@/lib/auth"

const authTabs = [
  { value: "password", label: "Password" },
  { value: "otp", label: "Email code" },
]

export function SignInForm() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null)
  const [form, setForm] = useState({ email: "", password: "" })
  const [rememberMe, setRememberMe] = useState(false)
  const [mode, setMode] = useState<"password" | "otp">("password")
  const [otpCode, setOtpCode] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const [isSendingCode, setIsSendingCode] = useState(false)

  useEffect(() => {
    if (!cooldown) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      if (mode === "password") {
        const { error } = await authClient.signIn.email({
          email: form.email,
          password: form.password,
          callbackURL: "/dashboard",
          rememberMe,
        })

        if (error) {
          toast.error(error.message ?? "Unable to sign in right now")
          return
        }
      } else {
        if (!otpCode) {
          toast.error("Enter the code we emailed you")
          return
        }

        const { error } = await authClient.signIn.emailOtp({
          email: form.email,
          otp: otpCode,
          callbackURL: "/dashboard",
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
  }

  const handleProviderSignIn = async (provider: "github" | "google") => {
    setOauthLoading(provider)
    try {
      const { error } = await authClient.signIn.social({ provider, callbackURL: "/dashboard" })
      if (error) {
        toast.error(error.message ?? `Unable to connect with ${provider}`)
      }
    } finally {
      setOauthLoading(null)
    }
  }

  const handleSendOtp = async () => {
    if (!form.email) {
      toast.error("Enter your email first")
      return
    }

    setIsSendingCode(true)
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email: form.email,
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
    <form className="space-y-4" onSubmit={handleSubmit}>
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

      {mode === "password" ? (
        <>
          <div className="space-y-2">
            <label htmlFor="signin-email" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signin-email"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="signin-password" className="text-sm font-medium">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="pl-10 pr-10"
                autoComplete="current-password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(Boolean(checked))}
              />
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>
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
          <div className="space-y-2">
            <label htmlFor="signin-email-otp" className="text-sm font-medium">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="signin-email-otp"
                type="email"
                placeholder="you@example.com"
                className="pl-10"
                autoComplete="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Input
                id="signin-otp"
                placeholder="6-digit code"
                className="tracking-[0.5em] text-center text-lg"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                maxLength={6}
              />
              <Zap className="pointer-events-none absolute right-3 top-1/2 hidden size-4 -translate-y-1/2 text-primary sm:block" />
            </div>
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

      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => handleProviderSignIn("github")}
          disabled={oauthLoading === "github"}
        >
          <Github className="mr-2 size-4" />
          {oauthLoading === "github" ? "Connecting..." : "GitHub"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => handleProviderSignIn("google")}
          disabled={oauthLoading === "google"}
        >
          <svg className="mr-2 size-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {oauthLoading === "google" ? "Connecting..." : "Google"}
        </Button>
      </div>
    </form>
  )
}
