import Link from 'next/link';
import { ArrowRight, Layers, PenTool, ShieldCheck, Sparkles } from 'lucide-react';

import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';

const METRICS = [
	{ value: '18k+', label: 'Resumes refined' },
	{ value: '620', label: 'Brand playbooks' },
	{ value: '3x', label: 'Faster sign-off' },
];

const CAPABILITY_CARDS = [
	{
		icon: PenTool,
		title: 'Narrative sculptor',
		description: 'Blend quant, story, and voice guidance so every line feels curated.',
	},
	{
		icon: Layers,
		title: 'Brand memory',
		description: 'Store palettes, typography, and tone cues for each company instantly.',
	},
	{
		icon: ShieldCheck,
		title: 'Integrity guard',
		description: 'Redact safely, watermark exports, and keep compliance happy.',
	},
];

const WORKFLOW_STEPS = [
	{
		step: '01',
		title: 'Collect the signal',
		description: 'Drop role briefs, audio notes, and decks — we parse the intent.',
	},
	{
		step: '02',
		title: 'Compose the arc',
		description: 'The studio drafts multi-section stories that feel interview-ready.',
	},
	{
		step: '03',
		title: 'Weave tangible proof',
		description: 'Auto-layer metrics, visuals, and case snapshots effortlessly.',
	},
	{
		step: '04',
		title: 'Share & adapt',
		description: 'One link for reviewers, tailored exports for ATS, PDF, and decks.',
	},
];

const TRUST_BADGES = [
	'Design orgs @ Linear, Notion, Hex',
	'Private workspaces',
	'Unlimited exports',
	'Feedback memory',
];

export default function AppHero() {
	return (
		<>
			<main className="relative min-h-screen w-full bg-surface text-white">
				{/* Simplified background */}
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,192,109,0.15),transparent_50%)]" />
					<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(244,192,109,0.08),transparent_50%)]" />
				</div>

				<div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
					{/* Hero Section */}
					<section className="flex flex-col items-center text-center">
						<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-brand-muted">
							<Sparkles className="size-3.5" />
							<span>Résumé intelligence, refined</span>
						</div>

						<h1 className="mt-8 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
							Resumes that feel{' '}
							<span className="text-brand">cinematic</span>, confident, and ready
						</h1>

						<p className="mt-6 max-w-2xl text-lg text-slate-400">
							We combine art-direction styling with recruiter-ready clarity. Bring your context and wins — the studio delivers a masterful story.
						</p>

						<div className="mt-10 flex flex-wrap items-center justify-center gap-4">
							<Button
								asChild
								size="lg"
								className="rounded-full bg-brand px-8 text-base font-semibold text-brand-foreground shadow-lg shadow-brand/20 transition-all hover:bg-brand/90 hover:shadow-xl hover:shadow-brand/25"
							>
								<Link href="/dashboard" className="flex items-center gap-2">
									Launch studio
									<ArrowRight className="size-4" />
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="lg"
								className="rounded-full border-white/20 bg-transparent px-8 text-base text-white hover:border-white/40 hover:bg-white/5"
							>
								<Link href="/showcase">View showcase</Link>
							</Button>
						</div>

						{/* Metrics */}
						<div className="mt-16 flex flex-wrap items-center justify-center gap-8 sm:gap-12">
							{METRICS.map((metric) => (
								<div key={metric.label} className="text-center">
									<p className="text-3xl font-semibold text-brand sm:text-4xl">{metric.value}</p>
									<p className="mt-1 text-sm text-slate-500">{metric.label}</p>
								</div>
							))}
						</div>
					</section>

					{/* Trust Badges */}
					<section className="mt-20 flex flex-wrap items-center justify-center gap-3">
						{TRUST_BADGES.map((badge) => (
							<span
								key={badge}
								className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-slate-400"
							>
								{badge}
							</span>
						))}
					</section>

					{/* Capabilities */}
					<section className="mt-24">
						<div className="text-center">
							<p className="text-sm font-medium uppercase tracking-widest text-brand-muted">
								Capabilities
							</p>
							<h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
								Built for teams that obsess over craft
							</h2>
						</div>
						<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{CAPABILITY_CARDS.map(({ icon: Icon, title, description }) => (
								<div
									key={title}
									className="group rounded-2xl border border-white/10 bg-surface-elevated p-6 transition-colors hover:border-brand/30"
								>
									<Icon className="size-6 text-brand" />
									<h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
									<p className="mt-2 text-sm text-slate-400">{description}</p>
								</div>
							))}
						</div>
					</section>

					{/* Workflow */}
					<section className="mt-24">
						<div className="text-center">
							<p className="text-sm font-medium uppercase tracking-widest text-brand-muted">
								Workflow
							</p>
							<h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
								Four steps from prompt to presentation
							</h2>
						</div>
						<div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
							{WORKFLOW_STEPS.map(({ step, title, description }) => (
								<div
									key={step}
									className="rounded-2xl border border-white/10 bg-surface-elevated p-5"
								>
									<span className="text-sm font-medium text-brand">{step}</span>
									<h3 className="mt-3 text-lg font-semibold text-white">{title}</h3>
									<p className="mt-2 text-sm text-slate-400">{description}</p>
								</div>
							))}
						</div>
					</section>

					{/* CTA Section */}
					<section className="mt-24 rounded-3xl border border-white/10 bg-surface-elevated p-8 text-center sm:p-12">
						<h2 className="text-2xl font-semibold text-white sm:text-3xl">
							Ready to craft your story?
						</h2>
						<p className="mx-auto mt-4 max-w-xl text-slate-400">
							Build once, remix endlessly. Invite hiring managers, share with coaches, or export to polished decks.
						</p>
						<div className="mt-8 flex flex-wrap items-center justify-center gap-4">
							<Button
								asChild
								className="rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-white/90"
							>
								<Link href="/dashboard">Get started free</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								className="rounded-full border-white/20 px-6 text-sm text-white hover:border-white/40 hover:bg-white/5"
							>
								<Link href="/pricing">See plans</Link>
							</Button>
						</div>
					</section>
				</div>
			</main>

			<Footer />
		</>
	);
}
