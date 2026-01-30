"use client";

import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, BadgeCheck, BookOpen, Layers, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const fade = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const listFade = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const PILLARS = [
  {
    title: "Editorial signal",
    description: "Curated resume narratives with structured evidence trails.",
    icon: BookOpen,
  },
  {
    title: "Verified clarity",
    description: "Bias-aware checks and role-weighted scoring every time.",
    icon: BadgeCheck,
  },
  {
    title: "Modular story blocks",
    description: "Swap sections, export decks, remix instantly.",
    icon: Layers,
  },
];

export function HeroEditorial() {
  return (
    <section className="relative overflow-hidden bg-[#f7f3ef] text-[#1a1814]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute right-[-20%] top-[-30%] size-[620px] rounded-full bg-[#f2c27b]/40 blur-[140px]" />
        <div className="absolute left-[-10%] bottom-[-20%] size-[520px] rounded-full bg-[#e9b7a4]/35 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.9),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,rgba(26,24,20,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(26,24,20,0.08)_1px,transparent_1px)] [background-size:64px_64px]" />
      </div>

      <motion.div
        variants={listFade}
        initial="hidden"
        animate="visible"
        className="relative mx-auto grid min-h-[90vh] max-w-6xl items-center gap-10 px-4 py-24 sm:px-6 lg:grid-cols-[1.1fr_0.9fr]"
      >
        <div className="flex flex-col gap-6">
          <motion.div
            variants={fade}
            className="inline-flex items-center gap-2 self-start rounded-full border border-black/10 bg-white/70 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-black/70"
          >
            <Sparkles className="size-3.5 text-[#c97b3b]" />
            Atelier-grade hiring
          </motion.div>

          <motion.h1 variants={fade} className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Editorially designed
            <span className="block text-[#c97b3b]">resume MVPs for hiring teams.</span>
          </motion.h1>

          <motion.p variants={fade} className="max-w-xl text-base text-[#5a534b] sm:text-lg">
            Treat your hiring pipeline like a magazine spread. Resumemo layers narrative, proof, and roles into a
            presentation-ready flow.
          </motion.p>

          <motion.div variants={fade} className="flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[#1a1814] px-7 text-sm font-semibold text-white shadow-[0_20px_40px_rgba(26,24,20,0.2)]"
            >
              <Link to="/dashboard" className="flex items-center gap-2">
                Build the story
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-black/20 bg-white/40 text-black hover:bg-white"
            >
              <Link to="/login">Preview formats</Link>
            </Button>
          </motion.div>

          <motion.div
            variants={fade}
            className="mt-2 grid gap-4 rounded-[28px] border border-black/10 bg-white/70 p-5"
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-black/60">
              <span>Studio edition</span>
              <span>v1.4</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "Narratives", value: "440+" },
                { label: "Role packs", value: "56" },
                { label: "Export styles", value: "12" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-black/10 bg-white p-4">
                  <p className="text-xl font-semibold text-black">{item.value}</p>
                  <p className="text-xs text-black/50">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={fade} className="relative">
          <div className="relative rounded-[32px] border border-black/10 bg-white/80 p-6 shadow-[0_30px_80px_rgba(26,24,20,0.15)]">
            <div className="absolute -top-6 left-6 rounded-full border border-black/10 bg-white px-4 py-2 text-xs text-black/70">
              Curated intake
            </div>
            <div className="grid gap-4">
              {PILLARS.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-black/10 bg-[#fdf9f4] p-4">
                  <Icon className="mb-3 size-4 text-[#c97b3b]" />
                  <p className="text-sm font-semibold text-black">{title}</p>
                  <p className="text-xs text-black/50">{description}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 rounded-2xl border border-black/10 bg-white p-4 text-xs text-black/60">
              Spotlight: "Signal brief" auto-formats a role narrative in 40 seconds.
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
