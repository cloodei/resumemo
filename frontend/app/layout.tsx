import "./globals.css";
import { type Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";

const fontSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fontHeading = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Résumé Ranker",
  description: "Résumé Ranker is a platform that helps you rank your résumés based on your job application needs.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`bg-background antialiased ${fontSans.variable} ${fontMono.variable} ${fontHeading.variable} font-heading`}>
        {children}
      </body>
    </html>
  );
}
