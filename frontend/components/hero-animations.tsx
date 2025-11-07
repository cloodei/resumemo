'use client';

import { useEffect, useState } from 'react';
import { motion, spring, easeInOut } from 'motion/react';
import Image from 'next/image';
import Link from 'next/link';
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
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: {
    y: 30,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: spring, stiffness: 80, damping: 15 },
  },
};

const glowAnimation = {
  opacity: [0.4, 0.7, 0.4],
  scale: [1, 1.1, 1],
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: easeInOut,
  },
};

const tooltipVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: spring,
      stiffness: 150,
      delay: 1.5,
    },
  },
};

const floatingAnimation = {
  y: [-10, 10, -10],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: easeInOut,
  },
};

interface HeroAnimationsProps {
  quickLinks: Array<{
    title: string;
    description: string;
    href: string;
    icon: any;
  }>;
  features: Array<{
    title: string;
    description: string;
    icon: any;
  }>;
  steps: Array<{
    title: string;
    description: string;
  }>;
  testimonials: Array<{
    value: string;
    label: string;
  }>;
}

export function HeroAnimations({ quickLinks, features, steps, testimonials }: HeroAnimationsProps) {
  const [randomArr, setRandomArr] = useState<number[]>([]);
  const [stats, setStats] = useState({
    resumes: 0,
    companies: 0,
    timeSaved: 0,
  });

  useEffect(() => {
    setRandomArr(Array.from({ length: 30 }).map(() => Math.random()));

    const interval = setInterval(() => {
      setStats((prev) => {
        const newResumes = prev.resumes >= 15000 ? 15000 : prev.resumes + 350;
        const newCompanies = prev.companies >= 750 ? 750 : prev.companies + 18;
        const newTimeSaved = prev.timeSaved >= 95 ? 95 : prev.timeSaved + 3;

        if (
          newResumes === 15000 &&
          newCompanies === 750 &&
          newTimeSaved === 95
        )
          clearInterval(interval);

        return {
          resumes: newResumes,
          companies: newCompanies,
          timeSaved: newTimeSaved,
        };
      });
    }, 40);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-indigo-900/30 via-black/70 to-gray-950 blur-3xl" />
        
        {/* Animated Grid */}
        <div className="absolute inset-0 opacity-10">
          <div className="size-full bg-[linear-gradient(to_right,rgba(255,255,255,0.22)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] bg-size-[4rem_4rem]"></div>
        </div>
        
        {/* Dynamic Glowing Orbs */}
        <div className="absolute top-20 -left-20 size-72 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -right-20 bottom-20 size-72 rounded-full bg-blue-600/20 blur-[120px]" />
        <motion.div
          animate={glowAnimation}
          className="absolute top-1/3 left-1/4 size-48 rounded-full bg-indigo-500/15 blur-[100px]"
        />
        <motion.div
          animate={glowAnimation}
          className="absolute right-1/4 bottom-1/3 size-48 rounded-full bg-purple-500/15 blur-[100px]"
          style={{ animationDelay: '2s' }}
        />
        
        {/* Floating Particles */}
        <div className="absolute inset-0 opacity-30">
          {randomArr.map((rand, i) => (
            <motion.div
              key={i}
              className="absolute size-1 rounded-full bg-white"
              style={{
                top: `${rand * 100}%`,
                left: `${randomArr[(i + 5) % 30] * 100}%`,
              }}
              animate={{
                opacity: [0.1, 0.9, 0.1],
                scale: [0.5, 1.5, 0.5],
              }}
              transition={{
                duration: 4 + rand * 3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: rand * 3,
              }}
            />
          ))}
        </div>
      </div>

      {/* Hero Image with Tooltips */}
      <motion.div 
        animate={floatingAnimation}
        className="fadein-blur relative z-0 mx-auto mb-10 size-[300px] lg:absolute lg:top-1/2 lg:right-1/2 lg:mx-0 lg:mb-0 lg:size-[500px] lg:translate-x-1/2 lg:-translate-y-2/3"
      >
        <Image
          src="https://i.postimg.cc/fLptvwMg/nexus.webp"
          alt="AI Resume Ranking Visualization"
          fill
          objectFit="contain"
          className="drop-shadow-[0_0_45px_#3358ea95] transition-all duration-1000 hover:scale-110"
        />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={tooltipVariants}
          className="absolute top-4 -left-4 rounded-lg border border-purple-500/30 bg-black/90 p-3 backdrop-blur-md lg:top-1/4 lg:-left-24"
        >
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400 animate-pulse" />
            <span className="text-xs font-semibold text-purple-200">
              Lightning Fast Analysis
            </span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={tooltipVariants}
          className="absolute top-1/2 -right-4 rounded-lg border border-blue-500/30 bg-black/90 p-3 backdrop-blur-md lg:-right-28"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-400 animate-pulse" />
            <span className="text-xs font-semibold text-blue-200">
              Smart Matching Engine
            </span>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={tooltipVariants}
          className="absolute bottom-4 left-4 rounded-lg border border-indigo-500/30 bg-black/90 p-3 backdrop-blur-md lg:bottom-1/4 lg:left-12"
          style={{ animationDelay: '0.4s' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
            <span className="text-xs font-semibold text-indigo-200">
              AI-Powered Insights
            </span>
          </div>
        </motion.div>
      </motion.div>

      {/* Main Content */}
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mb-10 flex w-full max-w-[1450px] grow flex-col items-center justify-center px-4 text-center sm:px-8 lg:mb-0 lg:items-start lg:justify-end lg:text-left"
      >
        <motion.div className="flex w-full flex-col items-center justify-between lg:flex-row lg:items-start">
          <div className="w-full lg:w-auto">
            <motion.div
              variants={itemVariants}
              className="mb-4 inline-flex items-center rounded-full border border-purple-500/40 bg-linear-to-r from-purple-500/15 to-transparent px-3 py-1 text-sm text-purple-300 backdrop-blur-sm"
            >
              <span className="mr-2 rounded-full bg-linear-to-r from-purple-600 to-blue-600 px-2 py-0.5 text-xs font-bold text-white animate-pulse">
                NEW
              </span>
              Next-Gen AI Resume Analysis
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mb-6 bg-linear-to-r from-white via-white to-slate-400 bg-clip-text text-3xl font-bold leading-tight text-transparent sm:text-4xl md:text-5xl lg:text-6xl"
            >
              Find Your Dream Candidate <br className="hidden sm:inline" />
              <span className="bg-linear-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
                10x Faster Than Ever
              </span>
            </motion.h1>

            <motion.div
              variants={itemVariants}
              className="mb-6 flex flex-wrap justify-center gap-4 md:gap-6 lg:justify-start"
            >
              <div className="group relative overflow-hidden rounded-xl border border-purple-500/20 bg-black/60 px-5 py-3 backdrop-blur-sm transition-all hover:border-purple-500/40 hover:bg-black/80">
                <div className="absolute inset-0 bg-linear-to-r from-purple-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="relative text-3xl font-bold text-white">
                  {stats.resumes.toLocaleString()}+
                </p>
                <p className="relative text-xs text-gray-400">Resumes Analyzed</p>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-blue-500/20 bg-black/60 px-5 py-3 backdrop-blur-sm transition-all hover:border-blue-500/40 hover:bg-black/80">
                <div className="absolute inset-0 bg-linear-to-r from-blue-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="relative text-3xl font-bold text-white">
                  {stats.companies}+
                </p>
                <p className="relative text-xs text-gray-400">Companies Trust Us</p>
              </div>
              <div className="group relative overflow-hidden rounded-xl border border-indigo-500/20 bg-black/60 px-5 py-3 backdrop-blur-sm transition-all hover:border-indigo-500/40 hover:bg-black/80">
                <div className="absolute inset-0 bg-linear-to-r from-indigo-600/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="relative text-3xl font-bold text-white">
                  {stats.timeSaved}%
                </p>
                <p className="relative text-xs text-gray-400">Time Saved</p>
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mb-8 flex flex-wrap items-center justify-center gap-2 lg:justify-start"
            >
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Powered by:
              </span>
              {['GPT-4', 'Claude 3', 'AWS', 'Vector DB'].map((tech, i) => (
                <motion.div
                  key={tech}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300 backdrop-blur-sm transition-all hover:border-purple-500/50 hover:bg-purple-950/50"
                >
                  <div className={`size-2 rounded-full animate-pulse ${
                    i === 0 ? 'bg-blue-400' :
                    i === 1 ? 'bg-purple-400' :
                    i === 2 ? 'bg-green-400' :
                    'bg-yellow-400'
                  }`}></div>
                  {tech}
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="mt-6 flex flex-col items-center lg:mt-0 lg:items-end">
            <motion.p
              variants={itemVariants}
              className="mb-8 max-w-md px-6 text-center text-lg leading-relaxed text-slate-300/90 lg:text-end"
            >
              Transform your hiring process with AI-driven resume analysis. Upload resumes, define your requirements, and get perfectly ranked candidates in seconds.
            </motion.p>
            
            <motion.div
              variants={itemVariants}
              className="mb-8 flex flex-col flex-wrap gap-4 sm:flex-row lg:justify-end"
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  asChild
                  className="group relative overflow-hidden rounded-full border-t border-purple-400 bg-linear-to-b from-purple-700 to-slate-950/80 px-8 py-6 text-white shadow-2xl shadow-purple-600/30 transition-all hover:shadow-purple-600/50"
                  size="lg"
                >
                  <Link href="/dashboard">
                    <span className="relative z-10">Get Started Free</span>
                    <ArrowRight className="relative z-10 ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    <div className="absolute inset-0 bg-linear-to-r from-purple-600 to-blue-600 opacity-0 transition-opacity group-hover:opacity-20" />
                  </Link>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-purple-500/30 bg-transparent text-white backdrop-blur-sm hover:border-purple-500/60 hover:bg-purple-500/10 hover:text-white"
                  size="lg"
                >
                  <Link href="/jobs/new">
                    <span>Live Demo</span>
                    <ArrowUpRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="group mx-auto flex items-center gap-3 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-2 backdrop-blur-sm transition-all hover:border-purple-500/30 hover:bg-slate-900/80 lg:mx-0 lg:ml-auto"
            >
              <div className="flex -space-x-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <motion.div
                    key={i}
                    className="size-7 overflow-hidden rounded-full border-2 border-slate-900 bg-slate-800"
                    whileHover={{ y: -3 }}
                  >
                    <div className="size-full bg-linear-to-br from-purple-500 to-blue-600 opacity-90"></div>
                  </motion.div>
                ))}
              </div>
              <span className="text-xs text-slate-300">
                <span className="font-bold text-white animate-pulse">750+</span>{' '}
                companies hiring smarter
              </span>
              <ArrowUpRight className="h-3 w-3 text-purple-400 transition-transform group-hover:rotate-45" />
            </motion.div>
          </div>
        </motion.div>
      </motion.main>

      {/* Features Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="relative z-10 w-full max-w-6xl px-4 pb-24 sm:px-8"
      >
        <div className="mt-12 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map(({ title, description, href, icon: Icon }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <Link
                href={href}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 text-left backdrop-blur-sm transition-all hover:-translate-y-1 hover:border-purple-400/40 hover:bg-white/10"
              >
                <div className="absolute inset-0 bg-linear-to-br from-purple-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <Icon className="relative mb-6 h-8 w-8 text-purple-300 transition-all group-hover:text-purple-200 group-hover:scale-110" />
                <div className="relative">
                  <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm text-slate-300/80">{description}</p>
                </div>
                <span className="relative mt-6 inline-flex items-center gap-1 text-sm font-medium text-purple-300">
                  Explore
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Features Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-16 rounded-3xl border border-white/10 bg-linear-to-b from-white/8 to-transparent p-8 backdrop-blur-sm sm:p-12"
        >
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Why teams choose Resumemo</h2>
            <p className="mt-3 text-base text-slate-300/80">
              Purpose-built workflows keep hiring focused, collaborative, and aligned with the way your brand evaluates talent.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {features.map(({ title, description, icon: Icon }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -5 }}
                className="group rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-purple-400/40 hover:bg-black/60"
              >
                <Icon className="mb-4 h-7 w-7 text-purple-300 transition-all group-hover:text-purple-200 group-hover:scale-110" />
                <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-300/80">{description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* How it Works */}
        <motion.section 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">How it works</h2>
              <p className="mt-2 max-w-xl text-base text-slate-300/80">
                A guided flow keeps everyone aligned, from intake to offer, without adding admin overhead.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {steps.map(({ title, description }, index) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm transition-all hover:border-purple-400/30 hover:bg-black/60"
              >
                <div className="absolute inset-0 bg-linear-to-br from-purple-600/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                <span className="relative inline-flex size-10 items-center justify-center rounded-full bg-purple-500/20 text-sm font-bold text-purple-200 transition-all group-hover:bg-purple-500/30">
                  0{index + 1}
                </span>
                <h3 className="relative text-lg font-semibold text-white">{title}</h3>
                <p className="relative text-sm text-slate-300/80">{description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Testimonials */}
        <motion.section 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm sm:p-10 lg:flex lg:items-center lg:justify-between"
        >
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.3em] text-purple-200/80">Loved by hiring teams</p>
            <p className="mt-4 text-xl font-semibold text-white sm:text-2xl">
              "Resumemo made it effortless for us to collaborate. Our hiring managers get clarity, our recruiters reclaim time, and candidates feel the pace."
            </p>
            <p className="mt-4 text-sm text-slate-300/80">Head of Talent, Series B SaaS</p>
          </div>
          <div className="mt-10 grid w-full gap-6 sm:grid-cols-3 sm:gap-8 lg:mt-0 lg:w-auto">
            {testimonials.map(({ value, label }, i) => (
              <motion.div 
                key={label} 
                whileHover={{ scale: 1.05 }}
                className="rounded-2xl border border-white/10 bg-black/30 p-5 text-center backdrop-blur-sm transition-all hover:border-purple-400/30"
              >
                <motion.span 
                  className="text-3xl font-bold text-white"
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  {value}
                </motion.span>
                <p className="mt-2 text-xs uppercase tracking-wide text-slate-300/70">{label}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Final CTA */}
        <motion.section 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mt-16 overflow-hidden rounded-3xl border border-purple-400/20 bg-linear-to-r from-purple-600/40 via-indigo-600/30 to-blue-600/30 p-8 backdrop-blur-sm sm:p-12"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">Bring clarity to every hiring decision</h2>
              <p className="mt-3 text-base text-purple-50/90">
                Start with a guided workspace tailored to your roles and give your team the edge in finding top talent sooner.
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  asChild
                  className="rounded-full border-t border-white/40 bg-white/20 px-6 py-6 text-white backdrop-blur-sm transition-all hover:bg-white/30"
                  size="lg"
                >
                  <Link href="/dashboard">Launch workspace</Link>
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                  size="lg"
                >
                  <Link href="/book-demo">Book a walkthrough</Link>
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </>
  );
}
