import { type Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign In - Résumé Ranker",
  description: "Sign in to your Résumé Ranker account",
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="relative w-full">{children}</div>
    </div>
  )
}
