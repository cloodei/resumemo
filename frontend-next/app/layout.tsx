import "./globals.css"
import localFont from "next/font/local"
import { type Metadata } from "next"
import { Geist, Inter } from "next/font/google"
import { Providers } from "@/components/providers"

const fontSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const fontHeading = Inter({
  variable: "--font-heading",
  subsets: ["latin"],
})

const fontProximaVara = localFont({
  src: "../public/ProximaVara-VF.ttf",
  variable: "--font-proxima-vara",
})

export const metadata: Metadata = {
  title: "Résumé Ranker",
  description: "Résumé Ranker is a platform that helps you rank your résumés based on your job application needs."
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontHeading.variable} ${fontProximaVara.variable} bg-background text-foreground antialiased`}
        style={{ fontFamily: 'var(--font-proxima-vara)' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
