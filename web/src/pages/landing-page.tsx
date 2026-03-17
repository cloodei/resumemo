import { Link } from "react-router-dom";
import { useRef } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { motion, useScroll, useTransform, type Variants } from "motion/react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { AppFooter } from "@/components/layout/app-footer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

/* ═══ Motion presets ═══ */
const revealUp: Variants = {
	hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
	visible: {
		opacity: 1,
		y: 0,
		filter: "blur(0px)",
		transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
	},
};
const stagger: Variants = {
	hidden: { opacity: 0 },
	visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const scaleIn: Variants = {
	hidden: { opacity: 0, scale: 0.92 },
	visible: {
		opacity: 1,
		scale: 1,
		transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
	},
};

/* ═══ Data ═══ */
const PIPELINE_STEPS = [
	{
		num: "01",
		label: "Drop",
		detail: "Drag up to 30 resumes — PDF, DOCX, TXT — into a single session.",
	},
	{
		num: "02",
		label: "Score",
		detail: "NLP entity extraction and TF-IDF ranking against your job brief.",
	},
	{
		num: "03",
		label: "Ship",
		detail: "Export ranked shortlists as CSV with full candidate breakdowns.",
	},
];

export default function LandingPage() {
	const parallaxRef = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({
		target: parallaxRef,
		offset: ["start start", "end start"],
	});
	const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

	return (
		<div className="min-h-screen bg-[#060608] text-white selection:bg-[#C95D42] selection:text-white">
			{/* ═══════════════ NAV ═══════════════ */}
			<nav className="fixed inset-x-0 top-0 z-50 backdrop-blur-md">
				<div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-white/10 to-transparent" />
				<div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
					<Link to="/" className="group flex items-center gap-2.5">
						<Logo className="size-8 rounded-xl transition-transform group-hover:scale-105" />
						<span className="text-lg font-semibold tracking-tight">Resumemo</span>
					</Link>
					<div className="flex items-center gap-2">
						<Button asChild variant="ghost" size="sm" className="text-white/60 hover:text-white">
							<Link to="/login">Sign in</Link>
						</Button>
						<Button
							asChild
							size="sm"
							className="rounded-full bg-[#C95D42] px-5 text-white shadow-[0_0_24px_rgba(201,93,66,0.5)] transition-shadow hover:bg-[#d4725a] hover:shadow-[0_0_32px_rgba(201,93,66,0.6)]"
						>
							<Link to="/dashboard" className="flex items-center gap-1.5">
								Get started <ArrowRight className="size-3.5" />
							</Link>
						</Button>
					</div>
				</div>
			</nav>

			{/* ═══════════════ HERO ═══════════════ */}
			<section ref={parallaxRef} className="relative min-h-dvh overflow-hidden">
				{/* Atmosphere layers */}
				<motion.div className="pointer-events-none absolute inset-0" style={{ y: bgY }}>
					{/* Warm terracotta bloom */}
					<div className="absolute -top-32 left-[-15%] size-[700px] rounded-full bg-[#C95D42]/25 blur-[200px]" />
					{/* Gold accent */}
					<div className="absolute right-[-10%] top-1/4 size-[500px] rounded-full bg-[#f4c06d]/15 blur-[180px]" />
					{/* Cool counterbalance */}
					<div className="absolute bottom-[-20%] left-1/3 size-[600px] rounded-full bg-[#7dd3fc]/8 blur-[200px]" />
					{/* Noise texture */}
					<div className="absolute inset-0 opacity-[0.035] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIHR5cGU9ImZyYWN0YWxOb2lzZSIgYmFzZUZyZXF1ZW5jeT0iLjc1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIi8+PC9zdmc+')]" />
					{/* Dot grid */}
					<div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(rgba(255,255,255,0.25)_1px,transparent_1px)] bg-size-[24px_24px]" />
					{/* Diagonal lines */}
					<div className="absolute inset-0 opacity-[0.03] bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.15)_0px,rgba(255,255,255,0.15)_1px,transparent_1px,transparent_60px)]" />
				</motion.div>

				{/* Content */}
				<div className="relative mx-auto grid min-h-dvh max-w-7xl items-center gap-12 px-6 pt-28 pb-16 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:px-10 lg:pt-32">
					{/* Left — Editorial typography */}
					<motion.div initial="hidden" animate="visible" variants={stagger} className="flex flex-col">
						<motion.div
							variants={revealUp}
							className="mb-6 w-fit rounded-full border border-[#C95D42]/30 bg-[#C95D42]/10 px-4 py-1.5 text-xs font-medium tracking-wider text-[#f4c06d] uppercase"
						>
							AI-powered resume screening
						</motion.div>

						<motion.h1 variants={revealUp} className="relative">
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
							{/* Decorative oversized accent */}
							<span className="pointer-events-none absolute -right-8 -top-12 text-[12rem] font-black leading-none text-white/2 select-none lg:-right-16 lg:text-[16rem]">
								R
							</span>
						</motion.h1>

						<motion.p variants={revealUp} className="mt-8 max-w-lg text-lg leading-relaxed text-white/50">
							Upload resumes, describe the role, close the tab.
							<br />
							<span className="text-white/80">
								The AI pipeline scores, ranks, and summarizes — you come back to a ready shortlist.
							</span>
						</motion.p>

						<motion.div variants={revealUp} className="mt-10 flex flex-wrap items-center gap-4">
							<Button
								asChild
								size="lg"
								className="group relative overflow-hidden rounded-full bg-[#C95D42] px-8 py-6 text-base font-semibold text-white shadow-[0_0_50px_rgba(201,93,66,0.5)] transition-all hover:shadow-[0_0_60px_rgba(201,93,66,0.6)]"
							>
								<Link to="/dashboard" className="relative flex items-center gap-2.5">
									<span className="absolute inset-0 rounded-full bg-linear-to-b from-white/20 to-transparent opacity-50" />
									<span className="relative">Start screening</span>
									<ArrowRight className="relative size-4 transition-transform group-hover:translate-x-1" />
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

					{/* Right — Asymmetric bento mosaic */}
					<motion.div
						initial="hidden"
						animate="visible"
						variants={stagger}
						className="relative grid grid-cols-5 grid-rows-5 gap-3 self-center lg:gap-4"
						style={{ minHeight: "420px" }}
					>
						{/* Decorative glow behind mosaic */}
						<div className="pointer-events-none absolute -inset-8 rounded-3xl bg-[radial-gradient(circle_at_30%_40%,rgba(201,93,66,0.15),transparent_60%)]" />

						{/* Panel A — Hero stat */}
						<motion.div
							variants={scaleIn}
							className="group relative col-span-3 row-span-3 overflow-hidden rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors hover:border-[#C95D42]/30"
						>
							<div className="absolute inset-0 bg-linear-to-br from-[#C95D42]/8 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
							<div className="relative flex h-full flex-col justify-between">
								<div>
									<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Pipeline throughput</p>
									<p className="mt-3 text-5xl font-bold tracking-tight lg:text-6xl">
										&lt;30<span className="text-lg font-medium text-white/40">s</span>
									</p>
									<p className="mt-1 text-sm text-white/40">Average scoring time per resume</p>
								</div>
								<div className="flex items-end gap-1.5">
									{[40, 65, 45, 80, 55, 90, 70, 85, 95, 60, 75, 88].map((h, i) => (
										<motion.div
											key={`bar-${i}`}
											className="w-full rounded-sm bg-linear-to-t from-[#C95D42]/60 to-[#f4c06d]/40"
											initial={{ height: 0 }}
											animate={{ height: `${h}%` }}
											transition={{ delay: 0.8 + i * 0.05, duration: 0.5, ease: "easeOut" }}
											style={{ maxHeight: "48px" }}
										/>
									))}
								</div>
							</div>
						</motion.div>

						{/* Panel B — File format badge */}
						<motion.div
							variants={scaleIn}
							className="col-span-2 row-span-2 flex flex-col justify-center rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
						>
							<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Formats</p>
							<div className="mt-3 flex flex-wrap gap-1.5">
								{["PDF", "DOCX", "TXT"].map((fmt) => (
									<span
										key={fmt}
										className="rounded-md border border-[#f4c06d]/20 bg-[#f4c06d]/10 px-2 py-0.5 text-[11px] font-semibold text-[#f4c06d]"
									>
										{fmt}
									</span>
								))}
							</div>
						</motion.div>

						{/* Panel C — Max files */}
						<motion.div
							variants={scaleIn}
							className="col-span-2 row-span-2 flex flex-col justify-between rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
						>
							<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Per session</p>
							<div>
								<p className="text-3xl font-bold">30</p>
								<p className="text-xs text-white/40">files max</p>
							</div>
						</motion.div>

						{/* Panel D — Pipeline phases */}
						<motion.div
							variants={scaleIn}
							className="col-span-3 row-span-2 flex flex-col justify-center rounded-[20px] border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
						>
							<p className="text-[10px] uppercase tracking-[0.4em] text-white/40">Pipeline</p>
							<div className="mt-3 flex items-center gap-2">
								{["Extract", "Parse", "Score", "Summarize"].map((step, i) => (
									<div key={step} className="flex items-center gap-2">
										<span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70">
											{step}
										</span>
										{i < 3 && <span className="text-[10px] text-white/20">→</span>}
									</div>
								))}
							</div>
						</motion.div>

						{/* Panel E — Export */}
						<motion.div
							variants={scaleIn}
							className="col-span-2 row-span-1 flex items-center justify-between rounded-[16px] border border-white/10 bg-[#C95D42]/10 p-3 backdrop-blur-sm"
						>
							<span className="text-xs font-medium text-[#f4c06d]">CSV Export</span>
							<ArrowUpRight className="size-3.5 text-[#C95D42]" />
						</motion.div>
					</motion.div>
				</div>

				{/* Bottom gradient fade */}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#060608] to-transparent" />
			</section>

			{/* ═══════════════ WORKFLOW — Vertical Timeline ═══════════════ */}
			<section className="relative py-32 overflow-hidden">
				{/* Section atmosphere */}
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute left-1/2 top-0 h-full w-px bg-linear-to-b from-transparent via-white/10 to-transparent" />
					<div className="absolute right-[-10%] top-1/4 size-[400px] rounded-full bg-[#f4c06d]/8 blur-[160px]" />
				</div>

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
								<span className="text-white/30">pile to pipeline.</span>
							</h2>
						</motion.div>

						<div className="grid gap-0 lg:gap-0">
							{PIPELINE_STEPS.map((step, index) => (
								<motion.div
									key={step.num}
									variants={revealUp}
									className={`group relative grid items-center gap-8 border-b border-white/5 py-12 lg:grid-cols-[200px_1fr_1.2fr] lg:gap-16 ${
										index === 0 ? "border-t" : ""
									}`}
								>
									{/* Step number */}
									<div className="flex items-baseline gap-3">
										<span className="text-6xl font-bold text-white/6 transition-colors group-hover:text-[#C95D42]/20 lg:text-7xl">
											{step.num}
										</span>
									</div>

									{/* Step label */}
									<div>
										<h3 className="text-3xl font-bold tracking-tight transition-colors group-hover:text-[#f4c06d] lg:text-4xl">
											{step.label}
										</h3>
									</div>

									{/* Step detail */}
									<p className="text-base leading-relaxed text-white/40 transition-colors group-hover:text-white/60 lg:text-lg">
										{step.detail}
									</p>

									{/* Hover accent line */}
									<div className="pointer-events-none absolute inset-y-0 left-0 w-[2px] bg-[#C95D42] opacity-0 transition-opacity group-hover:opacity-100" />
								</motion.div>
							))}
						</div>
					</motion.div>
				</div>
			</section>

			{/* ═══════════════ CAPABILITIES — Asymmetric Bento ═══════════════ */}
			<section className="relative py-32 overflow-hidden">
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute left-[-10%] top-1/3 size-[500px] rounded-full bg-[#C95D42]/10 blur-[180px]" />
					<div className="absolute right-[-5%] bottom-[-10%] size-[400px] rounded-full bg-[#7dd3fc]/8 blur-[160px]" />
				</div>

				<div className="relative mx-auto max-w-7xl px-6 lg:px-10">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-100px" }}
						variants={stagger}
					>
						<motion.div variants={revealUp} className="mb-16 flex flex-col items-end text-right lg:mr-12">
							<p className="text-[10px] uppercase tracking-[0.5em] text-[#C95D42]">Capabilities</p>
							<h2 className="mt-4 text-4xl font-bold tracking-tight lg:text-5xl">
								Built for recruiters
								<br />
								<span className="text-white/30">who hate busywork.</span>
							</h2>
						</motion.div>

						{/* Asymmetric grid */}
						<div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
							{/* Large card — NLP scoring */}
							<motion.div
								variants={scaleIn}
								className="group relative row-span-2 overflow-hidden rounded-[32px] border border-white/10 bg-white/4 p-8 transition-all hover:border-[#C95D42]/30 md:p-10"
							>
								<div className="absolute inset-0 bg-linear-to-b from-[#C95D42]/10 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
								<div className="relative flex h-full flex-col justify-between">
									<div>
										<div className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
											<span className="text-lg">🧠</span>
										</div>
										<h3 className="text-2xl font-bold tracking-tight">NLP-scored rankings</h3>
										<p className="mt-3 text-sm leading-relaxed text-white/40">
											spaCy entity recognition pulls skills, titles, employers, and credentials. TF-IDF scoring matches each resume against your job description to produce a ranked shortlist with explainable scores.
										</p>
									</div>
									<div className="mt-8 space-y-2">
										{["spaCy NER", "TF-IDF scoring", "Skill matching", "Contact extraction"].map(
											(tag) => (
												<span
													key={tag}
													className="mr-2 inline-block rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] text-white/50"
												>
													{tag}
												</span>
											),
										)}
									</div>
								</div>
							</motion.div>

							{/* Background processing */}
							<motion.div
								variants={scaleIn}
								className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/4 p-6 transition-all hover:border-[#f4c06d]/20"
							>
								<div className="absolute inset-0 bg-linear-to-br from-[#f4c06d]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
								<div className="relative">
									<div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
										<span className="text-sm">⏳</span>
									</div>
									<h3 className="text-lg font-bold">Background processing</h3>
									<p className="mt-2 text-sm text-white/40">
										Sessions run in the background. Start a job, close the tab, come back when scoring is done.
									</p>
								</div>
							</motion.div>

							{/* Bulk parsing */}
							<motion.div
								variants={scaleIn}
								className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/4 p-6 transition-all hover:border-[#7dd3fc]/20"
							>
								<div className="absolute inset-0 bg-linear-to-br from-[#7dd3fc]/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
								<div className="relative">
									<div className="mb-4 flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
										<span className="text-sm">📄</span>
									</div>
									<h3 className="text-lg font-bold">Bulk resume parsing</h3>
									<p className="mt-2 text-sm text-white/40">
										Drop PDF, DOCX, or TXT files. Text extraction, contact info, skills — all automatic.
									</p>
								</div>
							</motion.div>

							{/* Export — Wide card */}
							<motion.div
								variants={scaleIn}
								className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#C95D42]/6 p-6 transition-all hover:border-[#C95D42]/30 md:col-span-2"
							>
								<div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
									<div>
										<h3 className="text-lg font-bold">One-click CSV export</h3>
										<p className="mt-1 text-sm text-white/40">
											Candidate summaries, scores, skills, and contact details — ready for your ATS or spreadsheet.
										</p>
									</div>
									<Button
										asChild
										className="w-fit rounded-full bg-[#C95D42]/20 text-[#f4c06d] hover:bg-[#C95D42]/30"
									>
										<Link to="/dashboard" className="flex items-center gap-2">
											Try it now <ArrowRight className="size-3.5" />
										</Link>
									</Button>
								</div>
							</motion.div>
						</div>
					</motion.div>
				</div>
			</section>

			{/* ═══════════════ SPONSORS ═══════════════ */}
			<section className="relative py-20">
				<div className="mx-auto max-w-7xl px-6 lg:px-10">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-60px" }}
						variants={stagger}
					>
						<motion.div
							variants={revealUp}
							className="flex flex-col items-center gap-8 rounded-[32px] border border-white/8 bg-white/3 p-8 sm:flex-row sm:justify-between lg:px-12 lg:py-10"
						>
							<div>
								<p className="text-[10px] uppercase tracking-[0.5em] text-[#f4c06d]/50">
									Sponsors &amp; Collaborators
								</p>
								<p className="mt-2 text-sm text-white/40">
									Backed by people who believe in better hiring.
								</p>
							</div>
							<div className="flex items-center -space-x-2">
								{[
									{ src: "/sponsor1.jpg", fallback: "TMT" },
									{ src: "/sponsor2.jpg", fallback: "NVN" },
									{ src: "/dunk.jpg", fallback: "GOB" },
									{ src: "/forest-goblins.png", fallback: "GOB" },
								].map((sponsor, i) => (
									<Avatar
										key={`sponsor-${i}`}
										className="size-11 border-2 border-[#060608] ring-1 ring-white/10 transition-transform hover:z-10 hover:scale-110"
									>
										<AvatarImage src={sponsor.src} />
										<AvatarFallback className="bg-white/10 text-xs">{sponsor.fallback}</AvatarFallback>
									</Avatar>
								))}
							</div>
						</motion.div>
					</motion.div>
				</div>
			</section>

			{/* ═══════════════ FINAL CTA ═══════════════ */}
			<section className="relative overflow-hidden py-32">
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-[#C95D42]/15 blur-[200px]" />
				</div>

				<div className="relative mx-auto max-w-7xl px-6 text-center lg:px-10">
					<motion.div
						initial="hidden"
						whileInView="visible"
						viewport={{ once: true, margin: "-80px" }}
						variants={stagger}
					>
						<motion.h2
							variants={revealUp}
							className="mx-auto max-w-3xl text-4xl font-bold tracking-tight lg:text-6xl"
						>
							Stop reading resumes.
							<span className="block mt-2 bg-linear-to-r from-[#C95D42] to-[#f4c06d] bg-clip-text text-transparent">
								Start shipping shortlists.
							</span>
						</motion.h2>
						<motion.p variants={revealUp} className="mx-auto mt-6 max-w-md text-base text-white/40">
							Create your first profiling session in under a minute — upload, score, export, then get
							back to talking to real candidates.
						</motion.p>
						<motion.div variants={revealUp} className="mt-10 flex flex-wrap items-center justify-center gap-4">
							<Button
								asChild
								size="lg"
								className="rounded-full bg-white px-8 py-6 text-base font-semibold text-[#060608] shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all hover:bg-white/90 hover:shadow-[0_0_50px_rgba(255,255,255,0.2)]"
							>
								<Link to="/dashboard">Launch your workspace</Link>
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
					</motion.div>
				</div>
			</section>

			<AppFooter />
		</div>
	);
}
