'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { motion, spring, easeInOut } from 'motion/react';
import { ArrowRight, ArrowUpRight, Database, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: {
    y: 24,
    opacity: 0,
    filter: 'blur(4px)',
  },
  visible: {
    y: 0,
    opacity: 1,
    filter: 'blur(0px)',
    transition: { 
      type: spring, 
      stiffness: 100, 
      damping: 12,
      mass: 0.8
    },
  },
};

const glowAnimation = {
  opacity: [0.2, 0.4, 0.2],
  scale: [1, 1.08, 1],
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: easeInOut,
  },
};

const tooltipVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 8, filter: 'blur(2px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: {
      type: spring,
      stiffness: 200,
      damping: 15,
      delay: 1.2,
    },
  },
};

const floatingAnimation = {
  y: [-8, 8, -8],
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: easeInOut,
  },
};

const orbitCards = [
  {
    title: 'Signal Clarity',
    description: 'Confidence index is tuned in real time.',
    value: '98%',
    icon: ShieldCheck,
    position: 'top-6 -right-6',
  },
  {
    title: 'Pipeline Velocity',
    description: 'Time to shortlist stays under a minute.',
    value: '45s',
    icon: Zap,
    position: 'bottom-8 -left-10',
  },
  {
    title: 'Data Spine',
    description: 'Encrypted profile graph refreshes nightly.',
    value: '24/7',
    icon: Database,
    position: 'top-1/2 -left-12',
  },
];

const featureTiles = [
  {
    title: 'Story-ready insights',
    description: 'Narratives recruiters can drop straight into hiring updates.',
    icon: Sparkles,
  },
  {
    title: 'Bias guardrails',
    description: 'Governed scoring keeps every slate balanced and fair.',
    icon: ShieldCheck,
  },
  {
    title: 'Signal memory',
    description: 'Learns from each role to sharpen the next intake meeting.',
    icon: Database,
  },
];

const signalChips = ['Bias guard active', 'Context memory on', 'ATS friendly output'];

export function HeroAnimations() {
  const [randomArr, setRandomArr] = useState<number[]>([]);
  const [stats, setStats] = useState({
    resumes: 0,
    companies: 0,
    timeSaved: 0,
  });

  useEffect(() => {
    setRandomArr(Array.from({ length: 20 }).map(() => Math.random()));

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
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-0 left-1/4 size-96 rounded-full bg-purple-600/10 blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-indigo-600/10 blur-[128px]" />
        </div>
      
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="size-full bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[4rem_4rem]" />
        </div>
        
        <div className="absolute inset-0 opacity-10">
          {randomArr.map((rand: number, i: number) => (
            <motion.div
              key={i}
              className="absolute size-0.5 rounded-full bg-purple-400/50"
              style={{
                top: `${rand * 100}%`,
                left: `${randomArr[(i + 5) % 20] * 100}%`,
              }}
              animate={{
                opacity: [0.2, 0.8, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 5 + rand * 4,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: rand * 3,
              }}
            />
          ))}
        </div>
      </div>

      <motion.div 
        animate={floatingAnimation}
        className="fadein-blur relative z-0 mx-auto mb-16 size-[280px] lg:absolute lg:left-1/2 lg:top-1/2 lg:mb-0 lg:size-[520px] lg:-translate-x-12 lg:-translate-y-1/2"
      >
        <Image
          src="https://i.postimg.cc/fLptvwMg/nexus.webp"
          alt="Glass cube" 
          fill
          className="object-contain drop-shadow-[0_25px_80px_rgba(124,58,237,0.45)]"
        />
        {orbitCards.map(({ title, value, position, icon: Icon }, index) => (
          <motion.div
            key={title}
            initial="hidden"
            animate="visible"
            variants={tooltipVariants}
            transition={{ delay: 0.3 + index * 0.1 }}
            className={`absolute ${position} w-40 rounded-2xl border border-purple-500/20 bg-black/60 p-4 text-left backdrop-blur-xl`}
          >
            <div className="mb-1 flex items-center gap-2 text-xs text-purple-200/80">
              <Icon className="size-3.5" />
              {title}
            </div>
            <p className="text-lg font-semibold text-white">{value}</p>
          </motion.div>
        ))}
      </motion.div>

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 text-center sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:text-left"
      >
        <div className="flex w-full flex-col gap-6 lg:w-1/2">
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-3 self-center rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.3em] text-purple-200/80 lg:self-start"
          >
            Zero noise matches
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="bg-linear-to-r from-white via-gray-100 to-violet-300 bg-clip-text text-4xl font-semibold leading-tight text-transparent sm:text-5xl lg:text-6xl"
          >
            Craft unforgettable resumes with an <span className="bg-linear-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">AI studio</span> built for storytellers.
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="text-base text-slate-300/80"
          >
            Resumemo orchestrates tailored scripts, visuals, and interview-ready narratives so applicants can glow with confidence. No templates, just cinematic storytelling.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-wrap justify-center gap-3 lg:justify-start">
            {signalChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-purple-500/20 bg-black/40 px-4 py-1 text-xs font-medium text-slate-300"
              >
                {chip}
              </span>
            ))}
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-2 flex flex-wrap items-center justify-center gap-4 lg:justify-start"
          >
            <Button
              asChild
              size="lg"
              className="group relative overflow-hidden rounded-full border border-purple-500/40 bg-linear-to-r from-purple-500 to-indigo-500 px-7 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(125,60,255,0.3)]"
            >
              <Link href="/dashboard" className="flex items-center gap-2">
                Start creating
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
                <span className="absolute inset-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-white/10 bg-white/5 px-6 py-3 text-base text-slate-200 hover:border-purple-500/30 hover:bg-white/10"
            >
              <Link href="/book-demo" className="flex items-center gap-2">
                See the editor
                <ArrowUpRight className="size-4" />
              </Link>
            </Button>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid w-full grid-cols-3 gap-4 rounded-2xl border border-white/5 bg-black/40 p-5 backdrop-blur-lg"
          >
            <div className="text-left">
              <p className="text-3xl font-semibold text-white">{stats.resumes.toLocaleString()}+</p>
              <p className="text-xs uppercase tracking-widest text-slate-500">Resumes sculpted</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-white">{stats.companies}+</p>
              <p className="text-xs uppercase tracking-widest text-slate-500">Studios</p>
            </div>
            <div>
              <p className="text-3xl font-semibold text-white">{stats.timeSaved}%</p>
              <p className="text-xs uppercase tracking-widest text-slate-500">Time saved</p>
            </div>
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          className="w-full rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl lg:w-1/2"
        >
          <div className="mb-6 flex items-center justify-between text-sm text-slate-300">
            <span>Creative control</span>
            <span className="text-purple-300">Live preview</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {featureTiles.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-white/5 bg-black/60 p-4">
                <Icon className="mb-3 text-purple-300" />
                <p className="text-base font-semibold text-white">{title}</p>
                <p className="text-sm text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.main>

      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        className="relative z-10 w-full max-w-6xl px-4 pb-24 sm:px-8"
      >
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featureTiles.map(({ title, description, icon: Icon }, index) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className="rounded-3xl border border-white/5 bg-black/40 p-5 backdrop-blur-lg"
            >
              <Icon className="mb-4 text-purple-200" />
              <p className="text-lg font-semibold text-white">{title}</p>
              <p className="text-sm text-slate-400">{description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
