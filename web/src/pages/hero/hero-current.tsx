"use client";

import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  Layers,
  PenTool,
  ShieldCheck,
  Sparkles,
  Zap,
  Check,
  ChevronRight,
} from "lucide-react";

import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/tlg";

const FEATURES = [
  {
    icon: PenTool,
    title: "Narrative sculptor",
    description: "Blend quant, story, and voice guidance so every line feels curated and interview-ready.",
  },
  {
    icon: Layers,
    title: "Brand memory",
    description: "Store palettes, typography, and tone cues for each company instantly with smart templates.",
  },
  {
    icon: ShieldCheck,
    title: "Integrity guard",
    description: "Redact safely, watermark exports, and keep compliance happy with built-in security.",
  },
  {
    icon: Zap,
    title: "Lightning fast",
    description: "Process resumes in seconds, not hours. AI-powered analysis delivers instant insights.",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Collect the signal",
    description: "Drop role briefs, audio notes, and decks — we parse the intent.",
  },
  {
    step: "02",
    title: "Compose the arc",
    description: "The studio drafts multi-section stories that feel interview-ready.",
  },
  {
    step: "03",
    title: "Weave tangible proof",
    description: "Auto-layer metrics, visuals, and case snapshots effortlessly.",
  },
  {
    step: "04",
    title: "Share & adapt",
    description: "One link for reviewers, tailored exports for ATS, PDF, and decks.",
  },
];

const TESTIMONIALS = [
  {
    quote: "This tool transformed how we approach candidate assessment. The AI insights are remarkably accurate.",
    author: "Sarah Chen",
    role: "Head of Talent @ Linear",
    avatar: "SC",
  },
  {
    quote: "We reduced our hiring time by 60%. The resume analysis is comprehensive yet easy to understand.",
    author: "Marcus Johnson",
    role: "VP Engineering @ Notion",
    avatar: "MJ",
  },
  {
    quote: "Finally, a tool that understands context. It doesn't just parse resumes, it tells stories.",
    author: "Emily Park",
    role: "Recruiting Lead @ Hex",
    avatar: "EP",
  },
];

const PRICING_FEATURES = [
  "Unlimited resume processing",
  "AI-powered ranking",
  "Team collaboration",
  "Custom scoring models",
  "API access",
  "Priority support",
];

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

export function HeroCurrent() {
  return (
    <div className="min-h-screen bg-surface text-white">
      <header className="fixed top-0 z-50 w-full border-b border-white/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo className="size-8 rounded-xl" />
            <span className="font-semibold text-white">Resumemo</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-slate-400 transition-colors hover:text-white">
              Features
            </a>
            <a href="#workflow" className="text-sm text-slate-400 transition-colors hover:text-white">
              How it works
            </a>
            <a href="#testimonials" className="text-sm text-slate-400 transition-colors hover:text-white">
              Testimonials
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="bg-brand text-brand-foreground hover:bg-brand/90">
              <Link to="/dashboard">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative min-h-screen w-full bg-surface text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,192,109,0.12),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(244,192,109,0.06),transparent_50%)]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 pt-32 sm:px-6">
          <section className="flex flex-col items-center py-20 text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="flex flex-col items-center"
            >
              <motion.div
                variants={fadeInUp}
                className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/10 px-4 py-1.5 text-sm text-brand"
              >
                <Sparkles className="size-3.5" />
                <span>AI-powered resume intelligence</span>
              </motion.div>

              <motion.h1
                variants={fadeInUp}
                className="mt-8 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
              >
                Prebuilt UI blocks to
                <br />
                <span className="text-brand">ship beautiful MVPs fast.</span>
              </motion.h1>

              <motion.p variants={fadeInUp} className="mt-6 max-w-xl text-lg text-slate-400">
                Copy-paste beautiful, responsive components without worrying about styling or animations. Build faster, launch
                sooner.
              </motion.p>

              <motion.div variants={fadeInUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full bg-brand px-8 text-base font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 hover:shadow-xl hover:shadow-brand/25"
                >
                  <Link to="/dashboard" className="flex items-center gap-2">
                    Get started
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white/20 bg-transparent px-8 text-base text-white hover:border-white/40 hover:bg-white/5"
                >
                  <a href="#features">Learn more</a>
                </Button>
              </motion.div>

              <motion.div variants={fadeInUp} className="mt-16 flex flex-wrap items-center justify-center gap-3">
                {["V0 Compatible", "Animated out of box", "Open source"].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-400"
                  >
                    {badge}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </section>

          <section id="features" className="py-24">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center"
            >
              <motion.p variants={fadeInUp} className="text-sm font-medium uppercase tracking-widest text-brand/70">
                Features
              </motion.p>
              <motion.h2 variants={fadeInUp} className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Built for teams that obsess over craft
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="mt-16 grid gap-6 sm:grid-cols-2"
            >
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <motion.div
                  key={title}
                  variants={fadeInUp}
                  className="group rounded-2xl border border-white/10 bg-surface-elevated p-6 transition-all hover:border-brand/30 hover:bg-surface-elevated/80"
                >
                  <div className="mb-4 inline-flex rounded-xl bg-brand/10 p-3">
                    <Icon className="size-5 text-brand" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
                </motion.div>
              ))}
            </motion.div>
          </section>

          <section id="workflow" className="py-24">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center"
            >
              <motion.p variants={fadeInUp} className="text-sm font-medium uppercase tracking-widest text-brand/70">
                How it works
              </motion.p>
              <motion.h2 variants={fadeInUp} className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Four steps from prompt to presentation
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              {WORKFLOW_STEPS.map(({ step, title, description }, index) => (
                <motion.div
                  key={step}
                  variants={fadeInUp}
                  className="relative rounded-2xl border border-white/10 bg-surface-elevated p-5"
                >
                  <span className="text-sm font-medium text-brand">{step}</span>
                  <h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{description}</p>
                  {index < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 text-white/20 lg:block" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          </section>

          <section id="testimonials" className="py-24">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="text-center"
            >
              <motion.p variants={fadeInUp} className="text-sm font-medium uppercase tracking-widest text-brand/70">
                Testimonials
              </motion.p>
              <motion.h2 variants={fadeInUp} className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                What our users say
              </motion.h2>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={staggerContainer}
              className="mt-16 grid gap-6 md:grid-cols-3"
            >
              {TESTIMONIALS.map(({ quote, author, role, avatar }) => (
                <motion.div
                  key={author}
                  variants={fadeInUp}
                  className="rounded-2xl border border-white/10 bg-surface-elevated p-6"
                >
                  <p className="text-sm leading-relaxed text-slate-300">"{quote}"</p>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-brand/20 text-sm font-semibold text-brand">
                      {avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{author}</p>
                      <p className="text-xs text-slate-500">{role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </section>

          <section className="py-24">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="overflow-hidden rounded-3xl border border-white/10 bg-surface-elevated"
            >
              <div className="grid lg:grid-cols-2">
                <motion.div variants={fadeInUp} className="p-8 sm:p-12">
                  <p className="text-sm font-medium uppercase tracking-widest text-brand/70">Get started</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Ready to craft your story?</h2>
                  <p className="mt-4 text-slate-400">
                    Build once, remix endlessly. Invite hiring managers, share with coaches, or export to polished decks.
                  </p>
                  <ul className="mt-8 space-y-3">
                    {PRICING_FEATURES.map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm text-slate-300">
                        <Check className="size-4 text-brand" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap gap-4">
                    <Button asChild className="bg-brand text-brand-foreground hover:bg-brand/90">
                      <Link to="/dashboard">Get started free</Link>
                    </Button>
                    <Button asChild variant="outline" className="border-white/20 text-white hover:bg-white/5">
                      <Link to="/pricing">See plans</Link>
                    </Button>
                  </div>
                </motion.div>

                <motion.div variants={fadeInUp} className="relative hidden lg:block">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(244,192,109,0.15),transparent_70%)]" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="size-64 rounded-full bg-brand/10 blur-3xl" />
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
