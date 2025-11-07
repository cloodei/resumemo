'use client';

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Database,
  Sparkles,
  ShieldCheck,
  LayoutDashboard,
  FilePlus,
  BookOpen,
  LifeBuoy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const quickLinks = [
  {
    title: 'Dashboard',
    description: 'Review searches and insights.',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Create Job',
    description: 'Start a new ranking job.',
    href: '/jobs/new',
    icon: FilePlus,
  },
  {
    title: 'Pricing',
    description: 'Choose your plan.',
    href: '/pricing',
    icon: BookOpen,
  },
  {
    title: 'Support',
    description: 'Get help anytime.',
    href: '/support',
    icon: LifeBuoy,
  },
];

const features = [
  {
    title: 'Precise Matching',
    description: 'AI-powered resume ranking with full reasoning.',
    icon: Database,
  },
  {
    title: 'Human-Friendly',
    description: 'Clear summaries for quick alignment.',
    icon: Sparkles,
  },
  {
    title: 'Secure & Compliant',
    description: 'Risk signals keep your pipeline clean.',
    icon: ShieldCheck,
  },
];

export function HeroSimple() {
  const [stats, setStats] = useState({
    resumes: 0,
    companies: 0,
    timeSaved: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setStats({
        resumes: 15000,
        companies: 750,
        timeSaved: 95,
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Clean gradient background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-linear-to-b from-background via-background/95 to-muted/30" />
      </div>

      {/* Hero Image */}
      <div className="relative z-10 mx-auto mb-12 size-[280px] lg:size-[400px]">
        <Image
          src="https://i.postimg.cc/fLptvwMg/nexus.webp"
          alt="AI Resume Ranking"
          fill
          className="object-contain opacity-90"
        />
      </div>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="mb-4 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm">
            <span className="font-medium text-primary">AI-Powered Resume Ranking</span>
          </div>

          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            Find the Perfect Candidate
            <br />
            <span className="text-primary">10x Faster</span>
          </h1>

          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            Transform your hiring process with AI-driven resume analysis. 
            Upload resumes, define requirements, get ranked candidates instantly.
          </p>

          {/* Stats */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="mb-10 flex flex-wrap justify-center gap-8"
          >
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">
                {stats.resumes.toLocaleString()}+
              </p>
              <p className="text-sm text-muted-foreground">Resumes Ranked</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{stats.companies}+</p>
              <p className="text-sm text-muted-foreground">Companies</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-foreground">{stats.timeSaved}%</p>
              <p className="text-sm text-muted-foreground">Time Saved</p>
            </div>
          </motion.div>

          {/* CTA Buttons */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="flex flex-col gap-4 sm:flex-row sm:justify-center"
          >
            <Button asChild size="lg" className="group">
              <Link href="/dashboard">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/jobs/new">Try Demo</Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Features */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="mt-24 grid gap-6 md:grid-cols-3"
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-lg border border-border bg-card p-6 transition-colors hover:bg-accent"
            >
              <feature.icon className="mb-4 h-8 w-8 text-primary" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </motion.div>

        {/* Quick Links */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {quickLinks.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:border-primary/50 hover:bg-accent"
            >
              <link.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">{link.title}</h3>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </div>
            </Link>
          ))}
        </motion.div>

        {/* Final CTA */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-20 rounded-xl bg-primary/5 p-8 text-center"
        >
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Ready to streamline your hiring?
          </h2>
          <p className="mb-6 text-muted-foreground">
            Join hundreds of companies using AI to find the best talent faster.
          </p>
          <Button asChild size="lg">
            <Link href="/dashboard">Start Free Trial</Link>
          </Button>
        </motion.div>
      </main>
    </>
  );
}
