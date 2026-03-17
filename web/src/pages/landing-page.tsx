import { Link } from "react-router-dom";
import { motion, type Variants } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/layout/app-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.92 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
	},
};
const revealUp: Variants = {
	hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
	visible: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
	},
};
const fadeUp = {
  hidden: {
    opacity: 0,
    y: 18
  },
  visible: {
    opacity: 1,
    y: 0
  },
};
const stagger: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const WORKFLOW_STEPS = [
	{
		num: "01",
		label: "Drop",
		detail: "Drag up to 30 resumes — PDF, DOCX, TXT — into a single session.",
	},
	{
		num: "02",
		label: "Score",
		detail: "Every resume is scored and ranked against your role brief — skills, titles, experience.",
	},
	{
		num: "03",
		label: "Ship",
		detail: "Export a ranked shortlist with scores, summaries, and contact info.",
	},
];

const CAPABILITIES = [
	{
		fig: "FIG 0.1",
		title: "Smart scoring",
		description: "Resumes are matched against your role brief — skills, experience, credentials — and ranked automatically.",
		svg: (
			<svg viewBox="0 0 200 160" fill="none" className="h-full w-full">
				<rect x="20" y="100" width="24" height="40" rx="4" stroke="rgba(255,255,255,0.15)" />
				<rect x="52" y="70" width="24" height="70" rx="4" stroke="rgba(255,255,255,0.15)" />
				<rect x="84" y="85" width="24" height="55" rx="4" stroke="rgba(255,255,255,0.15)" />
				<rect x="116" y="40" width="24" height="100" rx="4" stroke="rgba(255,255,255,0.2)" fill="rgba(255,255,255,0.03)" />
				<rect x="148" y="55" width="24" height="85" rx="4" stroke="rgba(255,255,255,0.15)" />
				<line x1="10" y1="140" x2="190" y2="140" stroke="rgba(255,255,255,0.08)" />
				<circle cx="128" cy="25" r="5" fill="rgba(201,93,66,0.5)" />
				<line x1="128" y1="30" x2="128" y2="40" stroke="rgba(201,93,66,0.3)" strokeDasharray="2 2" />
			</svg>
		),
	},
	{
		fig: "FIG 0.2",
		title: "Background processing",
		description: "Start a session, close the tab, come back later. Results are ready when you are.",
		svg: (
			<svg viewBox="0 0 200 160" fill="none" className="h-full w-full">
				<rect x="40" y="30" width="120" height="80" rx="8" stroke="rgba(255,255,255,0.15)" />
				<rect x="50" y="40" width="100" height="60" rx="4" stroke="rgba(255,255,255,0.08)" />
				<circle cx="70" cy="70" r="12" stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />
				<path d="M70 62 L70 70 L76 70" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round" />
				<rect x="90" y="58" width="50" height="4" rx="2" fill="rgba(255,255,255,0.08)" />
				<rect x="90" y="68" width="35" height="4" rx="2" fill="rgba(255,255,255,0.05)" />
				<rect x="90" y="78" width="45" height="4" rx="2" fill="rgba(255,255,255,0.05)" />
				<circle cx="160" cy="110" r="3" fill="rgba(244,192,109,0.4)" />
				<circle cx="155" cy="120" r="2" fill="rgba(244,192,109,0.2)" />
			</svg>
		),
	},
	{
		fig: "FIG 0.3",
		title: "Bulk resume parsing",
		description: "Drop PDFs, Word docs, or text files. Contact info, skills, and work history are extracted automatically.",
		svg: (
			<svg viewBox="0 0 200 160" fill="none" className="h-full w-full">
				{/* Stacked documents */}
				<rect x="70" y="20" width="70" height="90" rx="6" stroke="rgba(255,255,255,0.1)" transform="rotate(3 105 65)" />
				<rect x="65" y="25" width="70" height="90" rx="6" stroke="rgba(255,255,255,0.12)" transform="rotate(-2 100 70)" />
				<rect x="60" y="30" width="70" height="90" rx="6" stroke="rgba(255,255,255,0.18)" fill="rgba(255,255,255,0.02)" />
				<line x1="70" y1="50" x2="120" y2="50" stroke="rgba(255,255,255,0.1)" />
				<line x1="70" y1="60" x2="110" y2="60" stroke="rgba(255,255,255,0.07)" />
				<line x1="70" y1="70" x2="115" y2="70" stroke="rgba(255,255,255,0.07)" />
				<line x1="70" y1="80" x2="100" y2="80" stroke="rgba(255,255,255,0.05)" />
				{/* Arrow down */}
				<path d="M95 125 L95 145 M88 138 L95 145 L102 138" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
	{
		fig: "FIG 0.4",
		title: "One-click export",
		description: "Download your ranked shortlist as CSV — summaries, scores, and contact details included.",
		svg: (
			<svg viewBox="0 0 200 160" fill="none" className="h-full w-full">
				{/* Table grid */}
				<rect x="30" y="30" width="140" height="100" rx="8" stroke="rgba(255,255,255,0.15)" />
				<line x1="30" y1="55" x2="170" y2="55" stroke="rgba(255,255,255,0.1)" />
				<line x1="30" y1="75" x2="170" y2="75" stroke="rgba(255,255,255,0.06)" />
				<line x1="30" y1="95" x2="170" y2="95" stroke="rgba(255,255,255,0.06)" />
				<line x1="30" y1="115" x2="170" y2="115" stroke="rgba(255,255,255,0.06)" />
				<line x1="80" y1="30" x2="80" y2="130" stroke="rgba(255,255,255,0.06)" />
				<line x1="130" y1="30" x2="130" y2="130" stroke="rgba(255,255,255,0.06)" />
				{/* Header text placeholders */}
				<rect x="40" y="39" width="30" height="5" rx="2" fill="rgba(255,255,255,0.12)" />
				<rect x="90" y="39" width="25" height="5" rx="2" fill="rgba(255,255,255,0.12)" />
				<rect x="140" y="39" width="20" height="5" rx="2" fill="rgba(255,255,255,0.12)" />
				{/* Export arrow */}
				<path d="M175 65 L190 65 M185 60 L190 65 L185 70" stroke="rgba(201,93,66,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
	},
];

const STUDIO_FEATURES = [
	{ title: "Role briefing", description: "Describe the role, set priorities, and let scoring do the rest." },
	{ title: "Candidate cards", description: "Each resume becomes a scored, summarized profile card." },
	{ title: "Exportable decks", description: "One-click CSV with everything your hiring team needs." },
	{ title: "Session archive", description: "Every session is saved. Revisit, compare, or re-export anytime." },
];

export default function LandingPage() {
	return (
		<div className="min-h-screen bg-[#060608] text-white selection:bg-[#C95D42] selection:text-white">
			{/* Fixed structural texture — grid + noise */}
			<div className="pointer-events-none fixed inset-0 z-0">
				<div className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.15)_1px,transparent_1px)] bg-size-[72px_72px]" />
				<div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(rgba(255,255,255,0.3)_1px,transparent_1px)] bg-size-[24px_24px]" />
				<div className="absolute inset-0 opacity-[0.025] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIi8+PC9zdmc+')]" />
			</div>

			{/* Main content wrapper — blobs are absolute inside, stretching to full content height */}
			<main className="relative overflow-hidden">
				{/* Page-level ambient blobs — absolute inset-0 so they cover full page */}
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute -left-24 top-[-5%] size-[500px] rounded-full bg-[#C95D42]/12 blur-[160px]" />
					<div className="absolute right-[-15%] top-[5%] size-[450px] rounded-full bg-[#f4c06d]/8 blur-[160px]" />
					<div className="absolute left-[30%] top-[25%] size-[400px] rounded-full bg-[#7dd3fc]/5 blur-[180px]" />
					<div className="absolute right-[10%] top-[45%] size-[450px] rounded-full bg-[#C95D42]/8 blur-[180px]" />
					<div className="absolute left-[-10%] top-[65%] size-[400px] rounded-full bg-[#f4c06d]/6 blur-[180px]" />
					<div className="absolute right-[-5%] top-[85%] size-[350px] rounded-full bg-[#7dd3fc]/5 blur-[160px]" />
				</div>

				{/* ═══════════════ HERO ═══════════════ */}
				<section className="relative z-10 min-h-dvh">
				<div
					className="relative mx-auto grid min-h-dvh max-w-7xl items-center gap-12 px-6 pt-8 pb-14 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:px-10"
				>
					{/* Left — Editorial typography */}
					<motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col">
						<motion.div
							variants={revealUp}
							className="mb-6 w-fit rounded-full border border-[#C95D42]/30 bg-[#C95D42]/10 px-4 py-1.5 text-xs font-medium tracking-wider text-[#f4c06d] uppercase"
						>
							AI-powered resume screening
						</motion.div>

						<motion.h1 variants={revealUp}>
							<span className="block text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] font-bold tracking-tighter">
								Screen
							</span>
							<span className="block text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] font-bold tracking-tighter">
								<span className="bg-linear-to-r from-[#C95D42] via-[#f4c06d] to-[#f4c06d] bg-clip-text text-transparent">
									smarter.
								</span>
							</span>
							<span className="mt-2 block text-[clamp(2.8rem,6vw,5.5rem)] leading-[0.95] font-bold tracking-tighter text-white/40">
								Ship faster.
							</span>
						</motion.h1>

						<motion.p variants={revealUp} className="mt-8 max-w-lg text-lg leading-relaxed text-white/50">
							Upload resumes, describe the role, close the tab.
							<br />
							<span className="text-white/80">
								Come back to a scored, ranked shortlist — ready to export.
							</span>
						</motion.p>

						<motion.div variants={fadeUp} className="mt-2 flex flex-wrap items-center gap-5">
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
										{Array.from({ length: 15 }).map((_, index) => (
											<span
												key={`cta-point-${index}`}
												className="absolute -bottom-2 size-1 rounded-full bg-white/80 opacity-0"
												style={{
													left: `${5 + index * 9}%`,
													animation: `cta-float 1.${index}s ease-in-out ${index * 0.2}s infinite`,
												}}
											/>
										))}
									</span>
								</Link>
							</Button>
							<Link
								to="/login"
								className="group flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white"
							>
								Sign in to workspace
								<ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
							</Link>
						</motion.div>
					</motion.div>

					{/* Right — Compact stat cards (2×2) */}
					<motion.div
						initial="hidden"
						animate="visible"
						variants={stagger}
						className="relative grid grid-cols-2 gap-3 self-center lg:gap-4"
					>
						{/* Decorative glow behind cards */}
						<div className="pointer-events-none absolute -inset-8 rounded-3xl bg-[radial-gradient(circle_at_30%_40%,rgba(201,93,66,0.12),transparent_60%)]" />

						{/* Speed stat */}
						<motion.div
							variants={scaleIn}
							className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:border-[#C95D42]/30"
						>
							<div className="absolute inset-0 bg-linear-to-br from-[#C95D42]/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="relative">
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Speed</p>
								<p className="mt-3 text-4xl font-bold tracking-tight lg:text-5xl">
									&lt;30<span className="text-base font-medium text-white/40">s</span>
								</p>
								<p className="mt-1 text-xs text-white/40">Average per resume</p>
							</div>
						</motion.div>

						{/* File formats */}
						<motion.div
							variants={scaleIn}
							className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:border-[#f4c06d]/30"
						>
							<div className="absolute inset-0 bg-linear-to-br from-[#f4c06d]/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="relative">
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Formats</p>
								<div className="mt-3 flex flex-wrap gap-1.5">
									{["PDF", "DOCX", "TXT"].map((fmt) => (
										<span
											key={fmt}
											className="rounded-md border border-[#f4c06d]/20 bg-[#f4c06d]/10 px-2.5 py-1 text-[11px] font-semibold text-[#f4c06d]"
										>
											{fmt}
										</span>
									))}
								</div>
								<p className="mt-3 text-xs text-white/40">All major file types</p>
							</div>
						</motion.div>

						{/* Per session */}
						<motion.div
							variants={scaleIn}
							className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:border-[#7dd3fc]/30"
						>
							<div className="absolute inset-0 bg-linear-to-br from-[#7dd3fc]/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="relative">
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Per session</p>
								<p className="mt-3 text-4xl font-bold tracking-tight lg:text-5xl">30</p>
								<p className="mt-1 text-xs text-white/40">Resumes max</p>
							</div>
						</motion.div>

						{/* Export */}
						<motion.div
							variants={scaleIn}
							className="group relative overflow-hidden rounded-[24px] border border-white/10 bg-[#C95D42]/8 p-5 backdrop-blur-sm transition-colors hover:border-[#C95D42]/30"
						>
							<div className="absolute inset-0 bg-linear-to-br from-[#C95D42]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="relative flex h-full flex-col justify-between">
								<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Export</p>
								<div className="mt-3">
									<p className="text-sm font-semibold text-[#f4c06d]">CSV ready</p>
									<p className="mt-1 text-xs text-white/40">Scores, summaries, contacts</p>
								</div>
								<ArrowUpRight className="mt-3 size-4 text-[#C95D42] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
							</div>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* ═══════════════ WORKFLOW — Vertical Timeline ═══════════════ */}
			<section className="relative z-10 py-28 overflow-hidden">
				<div className="relative mx-auto max-w-7xl px-6 lg:px-10">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={stagger}
					>
						<motion.div variants={revealUp} className="mb-20 max-w-2xl">
							<p className="text-[10px] uppercase tracking-[0.5em] text-[#C95D42]">How it works</p>
							<h2 className="mt-4 text-4xl font-bold tracking-tight lg:text-5xl">
								Three moves from <br />
								<span className="text-white/30">pile to shortlist.</span>
							</h2>
						</motion.div>

						<div className="grid">
							{WORKFLOW_STEPS.map((step, index) => (
								<motion.div
									key={step.num}
									initial="idle"
									whileInView="active"
									viewport={{ once: false, margin: "-45% 0px -45% 0px" }}
									transition={{ staggerChildren: 0.08 }}
									className={`relative grid min-h-[30vh] items-start gap-8 border-b border-white/5 pl-3 pt-12 pb-2 lg:grid-cols-[200px_1fr_1.2fr] lg:gap-16 ${
										index === 0 ? "border-t" : ""
									}`}
								>
									{/* Step number */}
									<div className="flex items-baseline">
										<motion.span
											variants={{ idle: { color: "rgba(255,255,255,0.06)" }, active: { color: "rgba(201,93,66,0.25)" } }}
											transition={{ duration: 0.15, ease: "easeOut" }}
											className="text-6xl font-bold lg:text-7xl"
										>
											{step.num}
										</motion.span>
									</div>

									{/* Step label */}
									<div className="pt-4">
										<motion.h3
											variants={{ idle: { color: "rgba(255,255,255,1)" }, active: { color: "#f4c06d" } }}
											transition={{ duration: 0.15, ease: "easeOut" }}
											className="text-3xl font-bold tracking-tight lg:text-4xl"
										>
											{step.label}
										</motion.h3>
									</div>

									{/* Step detail */}
									<motion.p
										variants={{ idle: { color: "rgba(255,255,255,0.4)" }, active: { color: "rgba(255,255,255,0.65)" } }}
										transition={{ duration: 0.15, ease: "easeOut" }}
										className="text-base leading-relaxed lg:text-lg pt-2"
									>
										{step.detail}
									</motion.p>

									{/* Scroll-triggered accent line */}
									<motion.div
										variants={{ idle: { opacity: 0 }, active: { opacity: 1 } }}
										transition={{ duration: 0.2, ease: "easeOut" }}
										className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-[#C95D42]"
									/>
								</motion.div>
							))}
						</div>
					</motion.div>
				</div>
			</section>

			{/* ═══════════════ STUDIO KIT — Card Mosaic (from legacy) ═══════════════ */}
			<section className="relative z-10 py-28 overflow-hidden">
				<div className="relative mx-auto max-w-7xl px-6 lg:px-10">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={stagger}
					>
						<motion.div variants={revealUp} className="mb-16 max-w-2xl">
							<p className="text-[10px] uppercase tracking-[0.5em] text-[#C95D42]">Inside the workspace</p>
							<h2 className="mt-4 text-4xl font-bold tracking-tight lg:text-5xl">
								A screening studio <br />
								<span className="text-white/30">that works while you don't.</span>
							</h2>
						</motion.div>

						<div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
							{/* Left — Studio board (legacy-inspired editor card) */}
							<motion.div
								variants={scaleIn}
								className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6"
							>
								<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_50%)]" />
								<div className="relative">
									{/* Header bar */}
									<div className="flex items-center justify-between text-xs text-white/60">
										<span>Session board</span>
										<span className="rounded-full bg-white/10 px-3 py-1">Live</span>
									</div>
									{/* Feature sub-cards */}
									<div className="mt-6 grid gap-3 sm:grid-cols-2">
										{STUDIO_FEATURES.map(({ title, description }) => (
											<div key={title} className="rounded-2xl border border-white/10 bg-black/40 p-4 transition-colors hover:border-white/20">
												<p className="text-sm font-semibold text-white">{title}</p>
												<p className="mt-1.5 text-xs text-slate-400">{description}</p>
											</div>
										))}
										{/* Editor preview — wide card */}
										<div className="rounded-2xl border border-white/10 bg-black/50 p-4 sm:col-span-2">
											<div className="flex items-center justify-between text-xs text-white/60">
												<span>Result preview</span>
												<span className="rounded-full bg-white/10 px-2 py-1">Draft</span>
											</div>
											<div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.1fr]">
												<div className="rounded-xl border border-white/10 bg-black/60 p-3">
													<p className="text-xs uppercase tracking-[0.3em] text-white/60">Ranked list</p>
													<ul className="mt-3 space-y-2 text-xs text-white/70">
														<li className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1">
															<span>Sarah M.</span>
															<span className="text-[#f4c06d]">92</span>
														</li>
														<li className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1">
															<span>James K.</span>
															<span className="text-[#f4c06d]">87</span>
														</li>
														<li className="flex items-center justify-between rounded-md border border-white/10 bg-white/5 px-2 py-1">
															<span>Lena P.</span>
															<span className="text-[#f4c06d]">81</span>
														</li>
													</ul>
												</div>
												<div className="rounded-xl border border-white/10 bg-black/60 p-3">
													<div className="flex items-center justify-between text-xs text-white/60">
														<span>Summary</span>
														<span>Top match</span>
													</div>
													<div className="mt-3 space-y-2">
														<div className="h-2 w-3/4 rounded-full bg-white/10" />
														<div className="h-2 w-full rounded-full bg-white/10" />
														<div className="h-2 w-5/6 rounded-full bg-white/10" />
														<div className="h-2 w-2/3 rounded-full bg-white/10" />
													</div>
													<p className="mt-3 text-xs text-white/60">Auto-generated brief</p>
												</div>
											</div>
										</div>
									</div>
								</div>
							</motion.div>

							{/* Right — Description + Stats */}
							<motion.div variants={scaleIn} className="flex flex-col gap-5">
								<div className="rounded-[32px] border border-white/10 bg-white/5 p-6 lg:p-8">
									<p className="text-xs uppercase tracking-[0.3em] text-white/60">Why it matters</p>
									<h3 className="mt-3 text-2xl font-semibold text-white">
										Built for recruiters who hate busywork.
									</h3>
									<p className="mt-3 text-sm leading-relaxed text-slate-400">
										Every session runs in the background. Upload resumes, describe the role, and walk away.
										You get back a scored shortlist with candidate summaries, skills breakdown, and contact info — exportable in one click.
									</p>
									<div className="mt-6 space-y-2.5">
										{[
											"Automatic skill extraction",
											"Role-fit scoring",
											"Exportable summaries",
											"Session history",
										].map((item) => (
											<div key={item} className="flex items-center gap-2.5 text-sm text-white/70">
												<span className="size-1.5 shrink-0 rounded-full bg-[#C95D42]" />
												{item}
											</div>
										))}
									</div>
									<div className="mt-8 flex flex-wrap gap-3">
										<Button asChild className="rounded-full bg-white text-[#060608] hover:bg-white/90">
											<Link to="/dashboard">Try it free</Link>
										</Button>
										<Button
											asChild
											variant="outline"
											className="rounded-full border-white/20 text-white hover:bg-white/5"
										>
											<Link to="/login">Sign in</Link>
										</Button>
									</div>
								</div>

								{/* Quick stats row */}
								<div className="grid grid-cols-2 gap-3">
									<div className="rounded-[24px] border border-white/10 bg-black/50 p-5">
										<p className="text-xs uppercase tracking-[0.3em] text-white/60">Throughput</p>
										<p className="mt-3 text-2xl font-semibold">30s</p>
										<p className="text-xs text-white/40">per resume avg</p>
									</div>
									<div className="rounded-[24px] border border-white/10 bg-black/50 p-5">
										<p className="text-xs uppercase tracking-[0.3em] text-white/60">Accuracy</p>
										<p className="mt-3 text-2xl font-semibold">96%</p>
										<p className="text-xs text-white/40">skill match rate</p>
									</div>
								</div>
							</motion.div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* ═══════════════ CAPABILITIES — Figure-Labeled Editorial ═══════════════ */}
			<section className="relative z-10 py-28 overflow-hidden">
				{/* Subtle separator line */}
				<div className="absolute inset-x-0 top-0 mx-auto h-px max-w-5xl bg-linear-to-r from-transparent via-white/10 to-transparent" />

				<div className="relative mx-auto max-w-7xl px-6 lg:px-10">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={stagger}
					>
						<motion.div variants={revealUp} className="mb-20 text-center">
							<p className="text-[10px] uppercase tracking-[0.5em] text-[#C95D42]">Capabilities</p>
							<h2 className="mt-4 text-4xl font-bold tracking-tight lg:text-5xl">
								Everything you need
								<br />
								<span className="text-white/30">to screen with confidence.</span>
							</h2>
						</motion.div>

						{/* Figure-labeled grid — Linear-inspired */}
						<div className="grid gap-px border border-white/8 rounded-[2px] md:grid-cols-2 lg:grid-cols-4 bg-white/5 overflow-hidden">
							{CAPABILITIES.map(({ fig, title, description, svg }) => (
								<motion.div
									key={title}
									variants={revealUp}
									className="group relative flex flex-col bg-[#060608] p-6 lg:p-7"
								>
									{/* Figure label */}
									<p className="text-[10px] uppercase tracking-[0.4em] text-white/25">{fig}</p>

									{/* SVG illustration */}
									<div className="my-6 flex h-32 items-center justify-center lg:h-36">
										<div className="h-full w-full max-w-[180px] transition-transform group-hover:scale-[1.03]">
											{svg}
										</div>
									</div>

									{/* Text */}
									<div className="mt-auto">
										<h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
										<p className="mt-2 text-[13px] leading-relaxed text-white/40">{description}</p>
									</div>
								</motion.div>
							))}
						</div>
					</motion.div>
				</div>
			</section>

			{/* ═══════════════ FINAL CTA + SPONSORS ═══════════════ */}
			<section className="relative z-10 overflow-hidden py-20">
				<div className="relative mx-auto max-w-7xl px-6 text-center lg:px-10">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-80px" }}
						variants={stagger}
					>
						{/* Concentric decorative rings */}
						<div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
							<div className="size-[300px] rounded-full border border-white/5" />
							<div className="absolute inset-0 m-auto size-[500px] rounded-full border border-white/3" />
							<div className="absolute inset-0 m-auto size-[700px] rounded-full border border-white/1.5" />
						</div>

						<motion.h2
							variants={revealUp}
							className="relative mx-auto max-w-3xl text-4xl font-bold tracking-tight lg:text-6xl"
						>
							Stop reading resumes.
							<span className="mt-2 block bg-linear-to-r from-[#C95D42] to-[#f4c06d] bg-clip-text text-transparent">
								Start shipping shortlists.
							</span>
						</motion.h2>
						<motion.p variants={revealUp} className="relative mx-auto mt-6 max-w-md text-base text-white/40">
							Create your first session in under a minute — upload, score, export, then get
							back to talking to real candidates.
						</motion.p>
						<motion.div variants={revealUp} className="relative mt-10 flex flex-wrap items-center justify-center gap-4">
							{/* Gradient glow CTA (matching hero) */}
							<Button
								asChild
								size="lg"
								className="group relative overflow-hidden rounded-xl bg-[#C95D42] px-8 py-6 text-base font-semibold text-white shadow-[0_18px_45px_rgba(201,93,66,0.35)] transition-all hover:shadow-[0_18px_55px_rgba(201,93,66,0.45)]"
							>
								<Link to="/dashboard" className="relative flex items-center gap-2.5">
									<span className="absolute inset-0 rounded-xl bg-[radial-gradient(70%_80%_at_50%_100%,rgba(244,192,109,0.6),rgba(201,93,66,0)_70%)] opacity-70" />
									<span className="absolute inset-px rounded-[11px] bg-[linear-gradient(180deg,rgba(255,255,255,0.25),rgba(255,255,255,0))]" />
									<span className="relative z-10">Launch your workspace</span>
									<ArrowRight className="relative z-10 size-4 transition-transform group-hover:translate-x-1" />
								</Link>
							</Button>
							<Button
								asChild
								variant="outline"
								size="lg"
								className="rounded-full border-white/15 py-6 text-white hover:bg-white/5"
							>
								<Link to="/login">Sign in</Link>
							</Button>
						</motion.div>

						{/* Sponsors — compact, inline */}
						<motion.div variants={revealUp} className="relative mt-20">
							<div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-[28px] border border-white/8 bg-white/3 px-8 py-6 sm:flex-row sm:justify-between">
								<div className="text-left">
									<p className="text-[10px] uppercase tracking-[0.5em] text-[#f4c06d]/50">
										Sponsors &amp; Collaborators
									</p>
									<p className="mt-1.5 text-sm text-white/40">
										Backed by people who believe in better hiring.
									</p>
								</div>
								<div className="flex items-center -space-x-2.5 shrink-0">
									{[
										{ src: "/sponsor1.jpg", fallback: "TMT" },
										{ src: "/sponsor2.jpg", fallback: "NVN" },
										{ src: "/dunk.jpg", fallback: "GOB" },
										{ src: "/forest-goblins.png", fallback: "GOB" },
									].map((sponsor, i) => (
										<Avatar
											key={`sponsor-${i}`}
											className="size-10 border-2 border-[#060608] ring-1 ring-white/10 transition-transform hover:z-10 hover:scale-110"
										>
											<AvatarImage src={sponsor.src} />
											<AvatarFallback className="bg-white/10 text-xs">{sponsor.fallback}</AvatarFallback>
										</Avatar>
									))}
								</div>
							</div>
						</motion.div>
					</motion.div>
				</div>
			</section>
		</main>

			{/* CTA button float animation */}
			{/* <style>{`
				@keyframes cta-float {
					0%, 100% { opacity: 0; transform: translateY(0); }
					50% { opacity: 0.6; transform: translateY(-12px); }
				}
			`}</style> */}
		</div>
	);
}
