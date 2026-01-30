import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle2, Sparkles, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } },
};

const rise = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const SIGNALS = [
  "AI clarity score",
  "Role-fit highlights",
  "Team-ready shortlist",
  "Bias guardrails",
];

const STATS = [
  { label: "Resumes scored", value: "18k+" },
  { label: "Shortlist speed", value: "42s" },
  { label: "Hiring teams", value: "320" },
];

export function HeroNeon() {
  return (
    <section className="relative overflow-hidden bg-[#06060b] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-[-10%] size-[420px] rounded-full bg-[#ff3d71]/20 blur-[120px]" />
        <div className="absolute right-[-10%] top-[-20%] size-[520px] rounded-full bg-[#7c3aed]/30 blur-[140px]" />
        <div className="absolute bottom-[-20%] left-1/2 size-[520px] -translate-x-1/2 rounded-full bg-[#06b6d4]/20 blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.2)_1px,transparent_1px)] [background-size:48px_48px]" />
      </div>

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="visible"
        className="relative mx-auto flex min-h-[90vh] max-w-6xl flex-col justify-center gap-10 px-4 py-28 sm:px-6 lg:flex-row lg:items-center"
      >
        <div className="flex w-full flex-col gap-6 lg:w-3/5">
          <motion.div
            variants={rise}
            className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white/70"
          >
            <Sparkles className="size-3.5 text-[#ff3d71]" />
            Next-gen screening
          </motion.div>

          <motion.h1
            variants={rise}
            className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
          >
            Neon-grade hiring
            <span className="block bg-linear-to-r from-[#ff3d71] via-[#c084fc] to-[#38bdf8] bg-clip-text text-transparent">
              blocks for standout MVPs.
            </span>
          </motion.h1>

          <motion.p variants={rise} className="max-w-xl text-base text-slate-300 sm:text-lg">
            Resumemo turns raw resumes into cinematic, bias-aware hiring stories. Review faster, align teams, and ship
            confident shortlists.
          </motion.p>

          <motion.div variants={rise} className="flex flex-wrap gap-3">
            {SIGNALS.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/70"
              >
                {signal}
              </span>
            ))}
          </motion.div>

          <motion.div variants={rise} className="flex flex-wrap items-center gap-4">
            <Button
              asChild
              size="lg"
              className="group relative rounded-full bg-white px-7 text-sm font-semibold text-black shadow-[0_20px_60px_rgba(255,61,113,0.3)]"
            >
              <Link to="/dashboard" className="flex items-center gap-2">
                Launch now
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full border-white/15 bg-transparent text-white hover:bg-white/5"
            >
              <Link to="/login">See live demo</Link>
            </Button>
          </motion.div>

          <motion.div variants={rise} className="mt-2 grid gap-3 rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
              <span>Screening pulse</span>
              <span className="flex items-center gap-1 text-[#ff3d71]">
                <Zap className="size-3" /> Live
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {STATS.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/5 bg-black/40 p-4">
                  <p className="text-xl font-semibold text-white">{stat.value}</p>
                  <p className="text-xs text-white/50">{stat.label}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div variants={rise} className="relative w-full lg:w-2/5">
          <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
            <div className="absolute -top-6 right-6 rounded-full border border-white/10 bg-black/60 px-4 py-2 text-xs text-white/60">
              Talent radar
            </div>
            <div className="grid gap-4">
              {["Senior PM", "Design Lead", "Growth Analyst"].map((role, index) => (
                <div
                  key={role}
                  className="rounded-2xl border border-white/5 bg-black/60 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">{role}</span>
                    <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">{92 - index * 6}% fit</span>
                  </div>
                  <p className="mt-2 text-xs text-white/50">Auto-ranked narrative, verified skills, story momentum.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["Story", "Signal", "Score"].map((chip) => (
                      <span key={chip} className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/60">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 rounded-2xl border border-white/5 bg-black/60 p-4">
              {[
                "Scorecards auto-generated",
                "Calibrated per role",
                "Explainability audit",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-white/70">
                  <CheckCircle2 className="size-3.5 text-[#22d3ee]" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
