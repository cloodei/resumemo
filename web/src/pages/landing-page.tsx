import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  BrainCircuit,
  ChevronRight,
  Layers,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { AppFooter } from "@/components/app-footer";
import { Button } from "@/components/ui/button";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
};

const CTA_POINTS = Array.from({ length: 10 });

const HIGHLIGHTS = [
  {
    title: "Narrative sculptor",
    description: "Turn resumes into story-first briefs with a consistent hiring voice.",
    icon: BookOpen,
  },
  {
    title: "Signal layering",
    description: "Stack role-fit, growth arc, and skills into a single reviewer view.",
    icon: Layers,
  },
  {
    title: "Integrity guard",
    description: "Bias checks and compliance snapshots run automatically.",
    icon: ShieldCheck,
  },
  {
    title: "Curation engine",
    description: "Auto-surface standout evidence so teams align in minutes.",
    icon: BrainCircuit,
  },
];

const STATS = [
  { label: "Resumes reviewed", value: "18,420" },
  { label: "Time saved", value: "68%" },
  { label: "Active studios", value: "320" },
];

const SIGNALS = ["Live explainability", "Role memory", "ATS-ready exports"];

const WORKFLOW = [
  {
    step: "01",
    title: "Capture the intent",
    description: "Drop briefs, role notes, and priorities into a single intake.",
  },
  {
    step: "02",
    title: "Compose the narrative",
    description: "AI layers experience, metrics, and growth in a reviewer-friendly flow.",
  },
  {
    step: "03",
    title: "Calibrate together",
    description: "Align on signals with explainable scoring and audit trails.",
  },
];

const FEATURE_TILES = [
  {
    title: "Story-first scoring",
    description: "Rank candidates by evidence, not keyword density.",
    icon: BadgeCheck,
  },
  {
    title: "Recruiting playbooks",
    description: "Store role templates, tone, and interview priorities.",
    icon: BookOpen,
  },
  {
    title: "Signal vault",
    description: "Versioned snapshots keep every shortlist auditable.",
    icon: ShieldCheck,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#070709] text-white">
      <main className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 top-[-10%] size-[420px] rounded-full bg-[#2563eb]/20 blur-[140px]" />
          <div className="absolute right-[-20%] top-[-20%] size-[520px] rounded-full bg-[#9333ea]/20 blur-[160px]" />
          <div className="absolute bottom-[-25%] left-1/2 size-[540px] -translate-x-1/2 rounded-full bg-[#0ea5e9]/15 blur-[160px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.6),transparent_70%)]" />
          <div
            className="absolute inset-0 opacity-[0.12] bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] bg-size-[20px_20px]"
          />
          <div
            className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-size-[72px_72px]"
          />
          <div className="absolute inset-x-0 bottom-0 h-48 bg-[linear-gradient(180deg,rgba(7,7,9,0),rgba(7,7,9,0.7))]" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl px-4 pb-24 pt-32 sm:px-6">
          <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col gap-6">
              <motion.div
                variants={fadeUp}
                className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs uppercase tracking-[0.3em] text-white/70"
              >
                <Sparkles className="size-3.5 text-[#7dd3fc]" />
                Hiring studio
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
              >
                Build story-driven
                <span className="block text-white/95">resume MVPs that feel designed.</span>
              </motion.h1>

              <motion.p variants={fadeUp} className="max-w-xl text-base text-slate-300 sm:text-lg">
                Resumemo curates candidate signals into an editorial flow: proof, context, and explainability crafted for
                modern hiring teams.
              </motion.p>

              <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
                {SIGNALS.map((signal) => (
                  <span key={signal} className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs text-white/70">
                    {signal}
                  </span>
                ))}
              </motion.div>

              <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="relative overflow-hidden rounded-xl bg-[#2563eb] hover:bg-[#43c5ec] px-7 text-sm font-semibold text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)]"
                >
                  <Link to="/dashboard" className="group relative flex items-center gap-2">
                    <span className="absolute inset-0 rounded-xl bg-[radial-gradient(70%_80%_at_50%_100%,rgba(125,211,252,0.7),rgba(37,99,235,0)_70%)] opacity-70" />
                    <span className="absolute inset-px rounded-[11px] bg-[linear-gradient(180deg,rgba(255,255,255,0.3),rgba(255,255,255,0))]" />
                    <span className="relative z-10">Launch studio</span>
                    <ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1" />
                    <span className="pointer-events-none absolute inset-0 z-0">
                      {CTA_POINTS.map((_, index) => (
                        <span
                          key={`cta-point-${index}`}
                          className="absolute bottom-[-8px] h-1 w-1 rounded-full bg-white/80 opacity-0"
                          style={{
                            left: `${8 + index * 9}%`,
                            animation: `cta-float 2.${index}s ease-in-out ${index * 0.2}s infinite`,
                          }}
                        />
                      ))}
                    </span>
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-xl border-white/15 bg-transparent text-white hover:bg-white/5"
                >
                  <Link to="/login">Watch walkthrough</Link>
                </Button>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className="mt-2 grid gap-3 rounded-[28px] border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
                  <span>Signal pulse</span>
                  <span>Live</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {STATS.map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-xl font-semibold text-white">{stat.value}</p>
                      <p className="text-xs text-white/50">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>

            <motion.div initial="hidden" animate="visible" variants={stagger} className="grid gap-4">
              <motion.div
                variants={fadeUp}
                className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_50%)]" />
                <div className="relative flex items-center justify-between text-xs text-white/60">
                  <span>Role briefing</span>
                  <span className="rounded-full bg-white/10 px-3 py-1">v2.2</span>
                </div>
                <div className="relative mt-6 grid gap-4 sm:grid-cols-2">
                  {FEATURE_TILES.map(({ title, description, icon: Icon }) => (
                    <div key={title} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <Icon className="mb-3 size-4 text-[#7dd3fc]" />
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="text-xs text-slate-400">{description}</p>
                    </div>
                  ))}
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Signal dock</p>
                    <p className="mt-3 text-lg font-semibold">84%</p>
                    <p className="text-xs text-slate-400">Role calibration synced</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/60">Editors</p>
                    <div className="mt-3 flex items-center gap-2">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <span key={`avatar-${index}`} className="size-7 rounded-full border border-white/20 bg-white/10" />
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-slate-400">Collaborating now</p>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[26px] border border-white/10 bg-black/50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Shortlist</p>
                  <p className="mt-3 text-2xl font-semibold">24</p>
                  <p className="text-xs text-white/40">Candidates ready</p>
                </div>
                <div className="rounded-[26px] border border-white/10 bg-black/50 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Confidence</p>
                  <p className="mt-3 text-2xl font-semibold">96%</p>
                  <p className="text-xs text-white/40">Aligned scorecard</p>
                </div>
              </motion.div>
            </motion.div>
          </section>

          <section id="features" className="mt-24">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} variants={stagger}>
              <motion.div variants={fadeUp} className="text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Features</p>
                <h2 className="mt-4 text-3xl font-semibold text-white">A full studio for modern recruiting</h2>
              </motion.div>

              <div className="mt-12 grid gap-6 md:grid-cols-2">
                {HIGHLIGHTS.map(({ title, description, icon: Icon }) => (
                  <motion.div
                    key={title}
                    variants={fadeUp}
                    className="rounded-[28px] border border-white/10 bg-white/5 p-6"
                  >
                    <div className="mb-4 inline-flex rounded-2xl border border-white/10 bg-black/40 p-3">
                      <Icon className="size-5 text-[#7dd3fc]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{description}</p>
                  </motion.div>
                ))}
                <motion.div
                  variants={fadeUp}
                  className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 md:col-span-2"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(125,211,252,0.18),transparent_50%)]" />
                  <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-white/60">Bento library</p>
                      <h3 className="mt-4 text-2xl font-semibold text-white">Feature blocks with depth and intent.</h3>
                      <p className="mt-3 text-sm text-slate-400">
                        Pull from curated layouts, data tiles, and scorecards that keep brand and compliance aligned.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        {[
                          "Story deck",
                          "Hiring summary",
                          "Scorecard",
                          "Evidence vault",
                        ].map((chip) => (
                          <span key={chip} className="rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-white/70">
                            {chip}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                        <p className="text-2xl font-semibold">140+</p>
                        <p className="text-xs text-white/50">Active studios</p>
                        <div className="mt-4 flex items-center gap-2 text-xs text-[#7dd3fc]">
                          <span className="size-1.5 rounded-full bg-[#7dd3fc]" />
                          Q4 growth 23%
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/60">Signal map</p>
                        <div className="mt-4 flex items-center gap-2">
                          {Array.from({ length: 4 }).map((_, index) => (
                            <span key={`pulse-${index}`} className="size-2 rounded-full bg-white/30" />
                          ))}
                        </div>
                        <p className="mt-4 text-xs text-white/50">97.8% SLA met</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </section>

          <section id="workflow" className="mt-24">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} variants={stagger}>
              <motion.div variants={fadeUp} className="text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Workflow</p>
                <h2 className="mt-4 text-3xl font-semibold text-white">From intake to shortlist in three moves</h2>
              </motion.div>

              <div className="mt-12 grid gap-4 lg:grid-cols-3">
                {WORKFLOW.map((item, index) => (
                  <motion.div
                    key={item.step}
                    variants={fadeUp}
                    className="relative rounded-[24px] border border-white/10 bg-white/5 p-5"
                  >
                    <span className="text-xs uppercase tracking-[0.3em] text-white/60">{item.step}</span>
                    <h3 className="mt-3 text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-slate-400">{item.description}</p>
                    {index < WORKFLOW.length - 1 && (
                      <ChevronRight className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 text-white/25 lg:block" />
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </section>

          <section id="modules" className="mt-24">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-120px" }} variants={stagger}>
              <motion.div variants={fadeUp} className="text-center">
                <p className="text-xs uppercase tracking-[0.4em] text-white/50">Modules</p>
                <h2 className="mt-4 text-3xl font-semibold text-white">Blocks that feel intentional</h2>
                <p className="mt-3 text-sm text-slate-400">
                  Mix interview kits, signal dashboards, and export-ready decks without sacrificing design.
                </p>
              </motion.div>

              <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <motion.div variants={fadeUp} className="rounded-[32px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Studio board</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">Live</span>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {HIGHLIGHTS.slice(0, 2).map(({ title, description, icon: Icon }) => (
                      <div key={title} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                        <Icon className="mb-3 size-4 text-[#7dd3fc]" />
                        <p className="text-sm font-semibold text-white">{title}</p>
                        <p className="text-xs text-slate-400">{description}</p>
                      </div>
                    ))}
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-sm font-semibold text-white">Export modes</p>
                      <p className="mt-2 text-xs text-slate-400">Deck, ATS, PDF, stakeholder view.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-sm font-semibold text-white">Collaborative signals</p>
                      <p className="mt-2 text-xs text-slate-400">Live annotations and structured votes.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:col-span-2">
                      <div className="flex items-center justify-between text-xs text-white/60">
                        <span>Editor preview</span>
                        <span className="rounded-full bg-white/10 px-2 py-1">Draft</span>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.1fr]">
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3">
                          <p className="text-xs uppercase tracking-[0.3em] text-white/60">Outline</p>
                          <ul className="mt-3 space-y-2 text-xs text-white/70">
                            <li className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Header</li>
                            <li className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Candidate story</li>
                            <li className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Scorecards</li>
                            <li className="rounded-md border border-white/10 bg-white/5 px-2 py-1">Hiring notes</li>
                          </ul>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-black/60 p-3">
                          <div className="flex items-center justify-between text-xs text-white/60">
                            <span>Canvas</span>
                            <span>1200</span>
                          </div>
                          <div className="mt-3 h-28 rounded-lg border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
                          <p className="mt-3 text-xs text-white/60">Live layout sync</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={fadeUp} className="rounded-[32px] border border-white/10 bg-white/5 p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/60">Inside the stack</p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">Curation meets explainability.</h3>
                  <p className="mt-3 text-sm text-slate-400">
                    Every score ships with a narrative audit trail, snapshot history, and export-ready artifact.
                  </p>
                  <div className="mt-6 space-y-3">
                    {[
                      "Signal cohorts",
                      "Role score memory",
                      "Evidence snapshots",
                      "Compliance notes",
                    ].map((item) => (
                      <div key={item} className="flex items-center gap-2 text-sm text-white/70">
                        <span className="size-1.5 rounded-full bg-[#7dd3fc]" />
                        {item}
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button asChild className="rounded-full bg-white text-[#0a0a0d] hover:bg-white/90">
                      <Link to="/dashboard">Explore modules</Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="rounded-full border-white/20 text-white hover:bg-white/5"
                    >
                      <Link to="/login">Schedule review</Link>
                    </Button>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </section>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
