import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Compass, Layers, PenTool, ShieldCheck, Sparkles } from 'lucide-react';

import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/tlg';

const METRICS = [
  { value: '18k+', label: 'Resumes refined' },
  { value: '620', label: 'Brand playbooks' },
  { value: '3x', label: 'Faster stakeholder sign-off' },
];

const FEATURE_SPOTLIGHTS = [
  {
    title: 'Storyline arc',
    detail: 'Open strong, frame the tension, close with measurable lift — tailored per role.',
    meta: 'Scene · Climate ops',
  },
  {
    title: 'Proof stack',
    detail: 'Auto-pulled wins, links, and references with compliance-friendly receipts.',
    meta: 'Layered by ATS + portfolio',
  },
  {
    title: 'Delivery kit',
    detail: 'PDF, interactive brief, and recruiter summary minted in thirty seconds.',
    meta: 'Hand-off in 0:32',
  },
];

const CAPABILITY_CARDS = [
  {
    icon: PenTool,
    title: 'Narrative sculptor',
    description: 'Blend quant, story, and voice guidance so every line feels curated not canned.',
  },
  {
    icon: Layers,
    title: 'Layered brand memory',
    description: 'Store palettes, typography, and tone cues for each company or studio instantly.',
  },
  {
    icon: ShieldCheck,
    title: 'Integrity guard',
    description: 'Redact safely, watermark exports, and keep compliance happy inside one workspace.',
  },
];

const WORKFLOW_STEPS = [
  {
    icon: Compass,
    title: 'Collect the signal',
    description: 'Drop role briefs, audio notes, and industry decks — we parse the intent.',
  },
  {
    icon: PenTool,
    title: 'Compose the arc',
    description: 'The studio drafts multi-section stories that feel human and interview-ready.',
  },
  {
    icon: Layers,
    title: 'Weave tangible proof',
    description: 'Auto-layer metrics, visuals, and case snapshots without spreadsheet diving.',
  },
  {
    icon: Sparkles,
    title: 'Share & adapt',
    description: 'One link for reviewers, tailored exports for ATS, PDF, and live decks.',
  },
];

const TRUST_BADGES = [
  'Design orgs @ Linear, Notion, Hex',
  'Private workspaces + SOC 2 readiness',
  'Unlimited tailored exports',
  'Feedback memory that learns every edit',
];

const RESOURCE_HIGHLIGHTS = [
  {
    title: 'Tone shift',
    detail: 'Switch from founder-forward to ops-ready voice instantly.',
  },
  {
    title: 'Confidential layers',
    detail: 'Mask employers while sharing redacted previews.',
  },
  {
    title: 'Reviewer threads',
    detail: 'Comment once, feed future drafts automatically.',
  },
];

export default function AppHero() {
  return (
    <>
      <main className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#05050a] text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#f4c06d33,transparent_60%)] opacity-70" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,#0d373f66,transparent_65%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(5,8,15,0.95)_0%,rgba(8,12,18,0.7)_45%,transparent_75%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[120px_120px] opacity-15" />
          <div className="absolute inset-0 bg-[radial-gradient(circle,#ffffff08_1px,transparent_1px)] bg-size-[180px_180px] mix-blend-screen opacity-10" />
          <div className="absolute inset-x-0 top-12 h-72 -skew-y-6 bg-linear-to-r from-[#f9c77b1f] via-[#2a7f7f1a] to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
          <section className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="space-y-8">
              <div className="w-fit rounded-full border border-white/15 bg-white/5 pl-5 pr-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.6em] text-[#f5dec1]/80">
                Résumémo
              </div>

              <div className="space-y-4">
                <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-slate-50 sm:text-5xl">
                  A modern main stage for <span className="text-[#f4c06d]">resumes</span> that feel cinematic,
                  confident, and ready for scrutiny.
                </h1>
                <p className="text-base text-slate-200/85">
                  We combine art-direction level styling with recruiter-ready clarity. Bring briefs, context, and wins — the studio delivers a
                  masterful story without gimmicks or heavy-handed effects.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  size="lg"
                  className="rounded-full border border-[#f4c06d33] bg-linear-to-r from-[#f4c06d] via-[#f39a6b] to-[#ff8678] px-7 py-3 text-base font-semibold text-[#0a0a0d] shadow-[0_0_35px_rgba(244,192,109,0.35)] hover:-translate-y-0.5"
                >
                  <Link href="/dashboard" className="flex items-center gap-2">
                    Launch the studio
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full border-white/30 bg-white/5 px-6 py-3 text-base text-slate-100 hover:border-[#f4c06d40] hover:bg-white/10"
                >
                  <Link href="/showcase" className="flex items-center gap-2">
                    View showcase
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
              </div>

              <div className="grid gap-6 rounded-3xl border border-white/10 bg-[#0c0f15]/80 p-6 text-left shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
                <div className="grid gap-6 sm:grid-cols-3">
                  {METRICS.map((metric) => (
                    <div key={metric.label} className="space-y-2">
                      <p className="text-3xl font-semibold text-[#f4c06d]">{metric.value}</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{metric.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {RESOURCE_HIGHLIGHTS.map((item) => (
                    <div key={item.title} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <p className="text-sm font-semibold text-[#f9dec0]">{item.title}</p>
                      <p className="text-xs text-slate-400">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#0d1119]/80 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#f4c06d14,transparent_70%)]" />
              <div className="pointer-events-none absolute -inset-y-10 right-6 h-44 w-44 rounded-full border border-[#f4c06d22] blur-3xl" />
              <div className="relative flex items-center justify-between text-[0.7rem] uppercase tracking-[0.6em] text-slate-300/70">
                <span>Studio Scene</span>
                <span className="text-[#73e5c7]">Adaptive</span>
              </div>
              <div className="relative mt-8 space-y-5">
                {FEATURE_SPOTLIGHTS.map((item) => (
                  <div key={item.title} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{item.meta}</span>
                      <span className="text-[#f4c06d]">Live</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold text-white">{item.title}</p>
                    <p className="text-sm text-slate-400">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="relative mt-8 rounded-2xl border border-white/10 bg-black/40 p-5">
                <p className="text-xs uppercase tracking-[0.4em] text-amber-200/70">Reviewer view</p>
                <p className="mt-3 text-lg text-slate-100">
                  “Scene three is ready for panel review. Visual proof is aligned with the new brand playbook.”
                </p>
                <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="rounded-full border border-white/10 px-3 py-1">Context sync</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">Voice shift</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">Portfolio safe</span>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300/80">
            {TRUST_BADGES.map((badge) => (
              <span key={badge} className="rounded-full border border-white/5 bg-black/30 px-4 py-1">
                {badge}
              </span>
            ))}
          </section>

          <section className="mt-16">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.4em] text-amber-200/70">Capabilities</p>
                <h2 className="mt-2 font-mono text-3xl font-semibold text-white sm:text-4xl">Built for teams that obsess over craft.</h2>
              </div>
              <Link href="/features" className="text-sm text-[#f4c06d] hover:text-white">
                Explore full spec →
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CAPABILITY_CARDS.map(({ icon: Icon, title, description }) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-[#0e1118]/90 p-6 shadow-[0_15px_60px_rgba(0,0,0,0.4)] backdrop-blur">
                  <Icon className="mb-4 text-[#f4c06d]" />
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
            <div className="flex flex-col gap-4 text-left">
              <p className="text-sm uppercase tracking-[0.4em] text-amber-200/70">Workflow</p>
              <h2 className="font-mono text-3xl font-semibold text-white">A calm four-step path from prompt to presentation.</h2>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-4">
              {WORKFLOW_STEPS.map(({ icon: Icon, title, description }, index) => (
                <div key={title} className="rounded-3xl border border-white/10 bg-black/30 p-5">
                  <div className="mb-4 flex items-center justify-between text-xs text-slate-400">
                    <span>0{index + 1}</span>
                    <Icon className="text-[#f4c06d]" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">{title}</h3>
                  <p className="text-sm text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 grid gap-8 rounded-3xl border border-white/10 bg-linear-to-r from-white/10 via-[#0f2a2f]/30 to-transparent p-8 sm:p-10 lg:grid-cols-2">
            <div className="space-y-6">
              <p className="text-sm uppercase tracking-[0.4em] text-amber-200/70">Testimonial</p>
              <p className="font-mono text-2xl font-semibold text-white sm:text-3xl">
                “Resumemo gives us the polish of a creative studio with the rigor of an operations team. Every draft feels deliberate,
                modern, and ready for our executive slate.”
              </p>
              <p className="text-sm text-slate-300">Director of Talent Narrative · Series B SaaS</p>
            </div>
            <div className="space-y-6 rounded-3xl border border-white/10 bg-black/40 p-6">
              <p className="text-base text-slate-300">
                Build once, remix endlessly. Invite hiring managers, share with coaches, or export to polished decks without ever leaving the
                workspace.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button
                  asChild
                  className="rounded-full border border-white/10 bg-white/90 px-6 py-2.5 text-sm font-semibold text-black hover:bg-white"
                >
                  <Link href="/book-demo">Book a walkthrough</Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="rounded-full border-white/30 px-6 py-2.5 text-sm text-white hover:border-[#f4c06d]/40 hover:bg-white/10"
                >
                  <Link href="/pricing">See plans</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
