import Link from "next/link"
import { Metadata } from "next"
import { Sparkles } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SignInForm } from "./signin"
import { SignUpForm } from "./signup"
import { ThemeToggler } from "@/components/theme-toggle"

export const metadata: Metadata = {
  title: "Sign In - Résumé Ranker",
  description: "Sign in to your Résumé Ranker account",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <ThemeToggler className="absolute top-3 right-5" />

      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
            Welcome to Résumé Ranker
          </h1>
        </div>

        <Card className="relative overflow-hidden shadow-[0_3px_15px_rgba(0,0,0,0.07)]">
          <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-sky-500/40 via-violet-500/40 to-pink-500/40" />

          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-xl">Get started</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="mb-6 pb-0.5 grid w-full grid-cols-2">
                <TabsTrigger value="signin" className="border-none cursor-pointer">Sign In</TabsTrigger>
                <TabsTrigger value="signup" className="border-none cursor-pointer">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <SignInForm />
              </TabsContent>

              <TabsContent value="signup">
                <SignUpForm />
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t pt-6">
            <p className="text-center text-xs text-muted-foreground">
              AI-powered resume ranking for smarter hiring
            </p>
          </CardFooter>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-pink-500/40 via-violet-500/40 to-sky-500/40" />
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          Need help?{" "}
          <Link href="/support" className="text-primary hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  )
}
