import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, ChevronRight, Layers, ShieldCheck, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const container = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const PANELS = [
  {
    title: "Adaptive scoring",
    description: "Every role receives a tuned scoring spine.",
    icon: ShieldCheck,
  },
  {
    title: "Signal layers",
    description: "Stackable blocks with explainable evidence.",
    icon: Layers,
  },
];

export function HeroSynth() {
  return (
    <section className="relative overflow-hidden bg-[#070615] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10%] top-[-15%] size-[520px] rounded-full bg-[#22d3ee]/20 blur-[160px]" />
        <div className="absolute right-[-10%] bottom-[-20%] size-[560px] rounded-full bg-[#e879f9]/20 blur-[160px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.05),transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(120deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:36px_36px]" />
      </div>

      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex min-h-[90vh] max-w-6xl flex-col gap-10 px-4 py-24 sm:px-6 lg:flex-row lg:items-center"
      >
        <div className="flex w-full flex-col gap-6 lg:w-1/2">
          <motion.div
            variants={item}
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white/70"
          >
            <Sparkles className="size-3.5 text-[#22d3ee]" />
            Signal runway
          </motion.div>

          <motion.h1 variants={item} className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Synthwave-ready
            <span className="block text-[#22d3ee]">resume blocks for modern teams.</span>
          </motion.h1>

          <motion.p variants={item} className="text-base text-slate-300 sm:text-lg">
            Build a structured hiring runway with explainable layers, live scoring, and export-ready decks that stay on
            brand.
          </motion.p>

          <motion.div variants={item} className="flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[#22d3ee] px-7 text-sm font-semibold text-[#070615] shadow-[0_20px_40px_rgba(34,211,238,0.2)]"
            >
              <Link to="/dashboard" className="flex items-center gap-2">
                Start runway
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/5"
            >
              <Link to="/login">View pipeline</Link>
            </Button>
          </motion.div>

          <motion.div variants={item} className="grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
              <span>Runway status</span>
              <span>72% synced</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {PANELS.map(({ title, description, icon: Icon }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                  <Icon className="mb-3 size-4 text-[#22d3ee]" />
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={item} className="relative w-full lg:w-1/2">
          <div className="relative grid gap-4">
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between text-xs text-white/60">
                <span>Pipeline deck</span>
                <span className="rounded-full bg-white/10 px-2 py-1">v3.0</span>
              </div>
              <div className="mt-4 grid gap-3">
                {["Top signals", "Role fit", "Interview kit"].map((row, index) => (
                  <div key={row} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                    <span className="text-sm text-white/80">{row}</span>
                    <ChevronRight className="size-4 text-white/50" />
                  </div>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Shortlist</p>
                <p className="mt-3 text-2xl font-semibold">24</p>
                <p className="text-xs text-white/40">Candidates ready</p>
              </div>
              <div className="rounded-[26px] border border-white/10 bg-black/40 p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Confidence</p>
                <p className="mt-3 text-2xl font-semibold">96%</p>
                <p className="text-xs text-white/40">Aligned scorecard</p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
