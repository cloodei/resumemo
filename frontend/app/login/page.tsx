import Link from "next/link"
import { Metadata } from "next"

import { Logo } from "@/components/tlg"
import { SignInForm } from "./signin"
import { SignUpForm } from "./signup"
import { ThemeToggler } from "@/components/theme-toggle"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Sign In - Résumé Ranker",
  description: "Sign in to your Résumé Ranker account",
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-neutral-100 dark:bg-background">
      <ThemeToggler className="absolute top-3 right-5" />

      <div className="w-full max-w-lg space-y-6">
        <Card className="relative bg-white dark:bg-card border-neutral-300 dark:border-accent overflow-hidden">
          <div className="absolute left-0 right-0 top-0 h-px bg-linear-to-r from-emerald-500/30 via-primary/40 to-rose-500/40" />

          <CardHeader className="pb-2">
            <CardTitle>
              <Logo className="size-11 mx-auto" backgroundClassName="dark:fill-[#140005] fill-[#ffffff00]" />
            </CardTitle>
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
          <CardFooter className="pt-3">
            <p className="m-auto text-xs text-muted-foreground">
              AI-powered resume ranking for smarter hiring
            </p>
          </CardFooter>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-linear-to-r from-rose-500/40 via-primary/40 to-emerald-500/30" />
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
