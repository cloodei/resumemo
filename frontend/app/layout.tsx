import "./globals.css"
import { type Metadata } from "next"
import { Geist, Geist_Mono, Inter } from "next/font/google"
import { AppHeader } from "@/components/layout/app-header"
import { PageTransition } from "@/components/layout/page-transition"

const fontSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const fontHeading = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Résumé Ranker",
  description:
    "Résumé Ranker is a platform that helps you rank your résumés based on your job application needs.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={
          `${fontSans.variable} ${fontMono.variable} ${fontHeading.variable} bg-gradient-to-br from-background via-background to-muted antialiased font-heading`
        }
      >
        <div className="relative flex min-h-screen flex-col">
          <AppHeader />
          <PageTransition>
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6 lg:px-8">
              {children}
            </main>
          </PageTransition>
        </div>
      </body>
    </html>
  )
}
