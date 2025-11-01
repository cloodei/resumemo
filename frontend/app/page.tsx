'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { easeInOut, motion, spring } from 'motion/react';
import {
  ArrowRight,
  Database,
  Sparkles,
  Zap,
  ArrowUpRight,
  LayoutDashboard,
  FilePlus,
  BookOpen,
  LifeBuoy,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: {
    y: 20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: spring, stiffness: 100 },
  },
};

const glowAnimation = {
  opacity: [0.5, 0.8, 0.5],
  scale: [1, 1.05, 1],
  transition: {
    duration: 3,
    repeat: Infinity,
    ease: easeInOut,
  },
};

const tooltipVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: spring,
      stiffness: 100,
      delay: 1.2,
    },
  },
};

export default function AppHero() {
  const [randomArr, setRandomArr] = useState<number[]>([])
  const [stats, setStats] = useState({
    resumes: 0,
    companies: 0,
    timeSaved: 0,
  });

  const quickLinks = [
    {
      title: 'Dashboard',
      description: 'Review searches, shortlists, and insights in one view.',
      href: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Create a job',
      description: 'Spin up a new role and invite your hiring partners.',
      href: '/jobs/new',
      icon: FilePlus,
    },
    {
      title: 'Pricing',
      description: 'Choose a plan that scales with your hiring volume.',
      href: '/pricing',
      icon: BookOpen,
    },
    {
      title: 'Support',
      description: 'Browse guides or reach our team any time you need help.',
      href: '/support',
      icon: LifeBuoy,
    },
  ];

  const features = [
    {
      title: 'Precise shortlists',
      description: 'Our ranking engine surfaces the clearest fit with full reasoning.',
      icon: Database,
    },
    {
      title: 'Human-friendly AI',
      description: 'Readable summaries help recruiters align quickly with hiring managers.',
      icon: Sparkles,
    },
    {
      title: 'Confident decisions',
      description: 'Risk signals and compliance checks keep your pipeline clean.',
      icon: ShieldCheck,
    },
  ];

  const steps = [
    {
      title: 'Upload resumes',
      description: 'Bulk import or sync directly from your ATS in seconds.',
    },
    {
      title: 'Set criteria',
      description: 'Define must-haves, culture fit signals, and ideal experience.',
    },
    {
      title: 'Review matches',
      description: 'Compare candidates with side-by-side insights tailored to your team.',
    },
    {
      title: 'Share and decide',
      description: 'Send curated shortlists to stakeholders and move faster together.',
    },
  ];

  const testimonials = [
    { value: '78%', label: 'Less time screening' },
    { value: '40%', label: 'Higher interview-to-offer' },
    { value: '24h', label: 'Avg. time to shortlist' },
  ];

  useEffect(() => {
    setRandomArr(Array.from({ length: 20 }).map(() => Math.floor(Math.random())));

    const interval = setInterval(() => {
      setStats((prev) => {
        const newResumes = prev.resumes >= 10000 ? 10000 : prev.resumes + 250;
        const newCompanies = prev.companies >= 500 ? 500 : prev.companies + 12;
        const newTimeSaved = prev.timeSaved >= 90 ? 90 : prev.timeSaved + 2;

        if (
          newResumes === 10000 &&
          newCompanies === 500 &&
          newTimeSaved === 90
        )
          clearInterval(interval);

        return {
          resumes: newResumes,
          companies: newCompanies,
          timeSaved: newTimeSaved,
        };
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center overflow-hidden bg-black py-16 text-white sm:px-6 lg:px-8 lg:py-2">
      <div className="absolute inset-0 z-0 size-full rotate-180 items-center px-5 py-24 opacity-80 [background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)]"></div>
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-black/70 to-gray-950 blur-3xl"></div>

        <div className="absolute inset-0 opacity-10">
          <div className="size-full bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
        </div>

        <div className="absolute top-20 -left-20 size-60 rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="absolute -right-20 bottom-20 size-60 rounded-full bg-blue-600/20 blur-[100px]" />
        <motion.div
          animate={glowAnimation}
          className="absolute top-1/3 left-1/4 size-40 rounded-full bg-indigo-500/10 blur-[80px]"
        />
        <motion.div
          animate={glowAnimation}
          className="absolute right-1/4 bottom-1/3 size-40 rounded-full bg-purple-500/10 blur-[80px]"
        />

        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute size-1 rounded-full bg-white"
              style={{
                top: `${randomArr[i] * 100}%`,
                left: `${randomArr[i] * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [1, 1.5, 1],
              }}
              transition={{
                duration: 3 + randomArr[i] * 2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: randomArr[i] * 2,
              }}
            />
          ))}
        </div>
      </div>

      <div className="fadein-blur relative z-0 mx-auto mb-10 size-[300px] lg:absolute lg:top-1/2 lg:right-1/2 lg:mx-0 lg:mb-0 lg:size-[500px] lg:translate-x-1/2 lg:-translate-y-2/3">
        <Image
          src="https://i.postimg.cc/fLptvwMg/nexus.webp"
          alt="AI Resume Ranking Visualization"
          fill
          objectFit="contain"
          className="drop-shadow-[0_0_35px_#3358ea85] transition-all duration-1000 hover:scale-110"
        />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={tooltipVariants}
          className="absolute top-4 -left-4 rounded-lg border border-purple-500/30 bg-black/80 p-2 backdrop-blur-md lg:top-1/4 lg:-left-20"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-medium text-purple-200">
              Lightning Fast
            </span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={tooltipVariants}
          className="absolute top-1/2 -right-4 rounded-lg border border-blue-500/30 bg-black/80 p-2 backdrop-blur-md lg:-right-24"
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400" />
            <span className="text-xs font-medium text-blue-200">
              Precise Matching
            </span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={tooltipVariants}
          className="absolute bottom-4 left-4 rounded-lg border border-indigo-500/30 bg-black/80 p-2 backdrop-blur-md lg:bottom-1/4 lg:left-8"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-medium text-indigo-200">
              AI-Powered
            </span>
          </div>
        </motion.div>
      </div>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mb-10 flex w-full max-w-[1450px] flex-grow flex-col items-center justify-center px-4 text-center sm:px-8 lg:mb-0 lg:items-start lg:justify-end lg:text-left"
      >
        <motion.div className="flex w-full flex-col items-center justify-between lg:flex-row lg:items-start">
          <div className="w-full lg:w-auto">
            <motion.div
              variants={itemVariants}
              className="mb-4 inline-flex items-center rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-sm text-purple-300"
            >
              <span className="mr-2 rounded-full bg-purple-500 px-2 py-0.5 text-xs font-semibold text-white">
                New
              </span>
              AI-Powered Resume Ranking
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-6 bg-gradient-to-r from-white/70 via-white to-slate-500/80 bg-clip-text text-3xl leading-tight text-transparent sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Find the Perfect Candidate <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                10x Faster
              </span>
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="mb-6 flex flex-wrap justify-center gap-4 md:gap-6 lg:justify-start"
            >
              <div className="rounded-lg border border-purple-500/20 bg-black/40 px-4 py-2 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">
                  {stats.resumes.toLocaleString()}+
                </p>
                <p className="text-xs text-gray-400">Resumes Ranked</p>
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-black/40 px-4 py-2 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">
                  {stats.companies}+
                </p>
                <p className="text-xs text-gray-400">Companies</p>
              </div>
              <div className="rounded-lg border border-indigo-500/20 bg-black/40 px-4 py-2 backdrop-blur-sm">
                <p className="text-2xl font-bold text-white">
                  {stats.timeSaved}%
                </p>
                <p className="text-xs text-gray-400">Time Saved</p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mb-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
            >
              <span className="text-xs font-medium text-gray-400">
                Powered by:
              </span>
              <div className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm transition-all hover:bg-purple-950">
                <div className="size-2 rounded-full bg-blue-400"></div>
                GPT-4
              </div>
              <div className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm transition-all hover:bg-purple-950">
                <div className="size-2 rounded-full bg-purple-400"></div>
                Claude
              </div>
              <div className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm transition-all hover:bg-purple-950">
                <div className="size-2 rounded-full bg-green-400"></div>
                AWS S3
              </div>
              <div className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm transition-all hover:bg-purple-950">
                <div className="size-2 rounded-full bg-yellow-400"></div>
                +3 more
              </div>
            </motion.div>
          </div>

          <div className="mt-6 flex flex-col items-center lg:mt-0 lg:items-end">
            <motion.p
              variants={itemVariants}
              className="mb-8 max-w-md px-6 text-center text-lg leading-relaxed text-slate-300/90 lg:text-end"
            >
              Transform your hiring process with AI-driven resume analysis. Upload resumes, define your job requirements, and get ranked candidates instantly.
            </motion.p>
            <motion.div
              variants={itemVariants}
              className="mb-8 flex flex-col flex-wrap gap-4 sm:flex-row lg:justify-end"
            >
              <Button
                asChild
                className="group rounded-full border-t border-purple-400 bg-gradient-to-b from-purple-700 to-slate-950/80 px-6 py-6 text-white shadow-lg shadow-purple-600/20 transition-all hover:shadow-purple-600/40"
                size="lg"
              >
                <Link href="/dashboard">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="rounded-full border-purple-500/30 bg-transparent text-white hover:bg-purple-500/10 hover:text-white"
                size="lg"
              >
                <Link href="/jobs/new">Try Demo</Link>
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mx-auto flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/50 px-3 py-1 backdrop-blur-sm lg:mx-0 lg:ml-auto"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="size-6 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-800"
                  >
                    <div className="size-full bg-gradient-to-br from-purple-500 to-blue-600 opacity-80"></div>
                  </div>
                ))}
              </div>
              <span className="text-xs text-slate-300">
                <span className="font-semibold text-white">500+</span>{' '}
                companies already using
              </span>
              <ArrowUpRight className="h-3 w-3 text-purple-400" />
            </motion.div>
          </div>
        </motion.div>
      </motion.main>
      <div className="relative z-10 w-full max-w-6xl px-4 pb-24 sm:px-8">
        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ title, description, href, icon: Icon }) => (
            <Link
              key={title}
              href={href}
              className="group flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition-all hover:-translate-y-1 hover:border-purple-400/40 hover:bg-white/10"
            >
              <Icon className="mb-6 h-8 w-8 text-purple-300 transition-colors group-hover:text-purple-200" />
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-300/80">{description}</p>
              </div>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-purple-300">
                Explore
                <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>

        <section className="mt-16 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-transparent p-8 sm:p-12">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-semibold text-white sm:text-3xl">Why teams choose Resumemo</h2>
            <p className="mt-3 text-base text-slate-300/80">
              Purpose-built workflows keep hiring focused, collaborative, and aligned with the way your brand evaluates talent.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/10 bg-black/40 p-6 transition-all hover:border-purple-400/40 hover:bg-black/30"
              >
                <Icon className="mb-4 h-7 w-7 text-purple-300" />
                <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-300/80">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">How it works</h2>
              <p className="mt-2 max-w-xl text-base text-slate-300/80">
                A guided flow keeps everyone aligned, from intake to offer, without adding admin overhead.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ title, description }, index) => (
              <div
                key={title}
                className="relative flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/40 p-6"
              >
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-purple-500/20 text-sm font-semibold text-purple-200">
                  0{index + 1}
                </span>
                <h3 className="text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-300/80">{description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-white/10 bg-white/[0.04] p-8 sm:p-10 lg:flex lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-purple-200/80">Loved by hiring teams</p>
            <p className="mt-4 text-xl font-semibold text-white sm:text-2xl">
              “Resumemo made it effortless for us to collaborate. Our hiring managers get clarity, our recruiters reclaim time, and candidates feel the pace.”
            </p>
            <p className="mt-4 text-sm text-slate-300/80">Head of Talent, Series B SaaS</p>
          </div>
          <div className="mt-10 grid w-full gap-6 sm:grid-cols-3 sm:gap-8 lg:mt-0 lg:w-auto">
            {testimonials.map(({ value, label }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center">
                <span className="text-3xl font-bold text-white">{value}</span>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-300/70">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-3xl border border-purple-400/20 bg-gradient-to-r from-purple-600/40 via-indigo-600/30 to-blue-600/30 p-8 sm:p-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">Bring clarity to every hiring decision</h2>
              <p className="mt-3 text-base text-purple-50/90">
                Start with a guided workspace tailored to your roles and give your team the edge in finding top talent sooner.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <Button
                asChild
                className="rounded-full border-t border-white/40 bg-white/20 px-6 py-6 text-white backdrop-blur-sm transition-all hover:bg-white/30"
                size="lg"
              >
                <Link href="/dashboard">Launch workspace</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                size="lg"
              >
                <Link href="/book-demo">Book a walkthrough</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
      <div className="absolute right-auto -bottom-40 left-1/2 h-96 w-20 -translate-x-1/2 -rotate-45 rounded-full bg-gray-200/30 blur-[80px] lg:right-96 lg:left-auto lg:translate-x-0" />
      <div className="absolute right-auto -bottom-52 left-1/2 h-96 w-20 -translate-x-1/2 -rotate-45 rounded-full bg-gray-300/20 blur-[80px] lg:right-auto lg:left-auto lg:translate-x-0" />
      <div className="absolute right-auto -bottom-60 left-1/2 h-96 w-10 -translate-x-20 -rotate-45 rounded-full bg-gray-300/20 blur-[80px] lg:right-96 lg:left-auto lg:-translate-x-40" />
    </section>
  );
}
