"use client"

import { useEffect, useState } from "react"
import { ShieldCheck, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth"

export function EmailVerificationCard() {
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  useEffect(() => {
    if (!cooldown) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSendCode = async () => {
    if (!email) {
      toast.error("Enter your email first")
      return
    }

    setIsSending(true)
    try {
      const { error } = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: "email-verification",
      })

      if (error) {
        toast.error(error.message ?? "Unable to send code")
        return
      }

      toast.success("Verification code sent")
      setCooldown(60)
    } finally {
      setIsSending(false)
    }
  }

  const handleVerify = async () => {
    if (!otp) {
      toast.error("Enter the code from your inbox")
      return
    }

    setIsVerifying(true)
    try {
      const { error } = await authClient.emailOtp.verifyEmail({
        email,
        otp,
      })

      if (error) {
        toast.error(error.message ?? "Verification failed")
        return
      }

      toast.success("Email verified. You're all set!")
      setOtp("")
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <div className="relative mt-8 overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-6 shadow-[0_25px_80px_rgba(5,5,15,0.55)] backdrop-blur-xl">
      <div className="pointer-events-none absolute -inset-px rounded-3xl border border-white/10 opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.2),transparent_55%)]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-500/10 text-purple-200">
            <ShieldCheck className="size-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-purple-200/80">Verify access</p>
            <p className="text-base font-semibold text-white">Keep your workspace secure</p>
          </div>
        </div>

        <p className="text-sm text-slate-300/80">
          Send a one-time code to confirm your email or unlock your account without a password.
        </p>

        <div className="space-y-3">
          <Input
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="bg-black/30"
          />
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={isSending || cooldown > 0}
              className="flex-1 border-purple-500/30 text-purple-100 hover:border-purple-400/60 hover:bg-purple-500/10"
            >
              {isSending ? "Sending..." : cooldown > 0 ? `Resend in ${cooldown}s` : "Send verification code"}
            </Button>
            <div className="relative flex-1">
              <Input
                placeholder="6-digit code"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                maxLength={6}
                className="bg-black/30 tracking-[0.4em] text-center text-lg"
              />
              <Sparkles className="pointer-events-none absolute right-3 top-1/2 hidden size-4 -translate-y-1/2 text-purple-200/70 sm:block" />
            </div>
          </div>
        </div>

        <Button
          type="button"
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full rounded-2xl bg-linear-to-r from-purple-500 to-indigo-500 text-white shadow-[0_18px_35px_rgba(99,102,241,0.3)]"
        >
          {isVerifying ? "Verifying..." : "Verify email with code"}
        </Button>
      </div>
    </div>
  )
}
