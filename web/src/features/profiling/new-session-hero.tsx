import { motion } from "motion/react"

import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Step = {
	id: number
	title: string
	description: string
}

type NewSessionHeroProps = {
	steps: readonly Step[]
}

export function NewSessionHero({ steps }: NewSessionHeroProps) {
	return (
		<motion.section
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			className="flex flex-col gap-4"
		>
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between gap-2">
					<h1 className="head-text-md text-foreground">Describe, upload, and launch</h1>
					<Badge className="w-fit bg-linear-to-br from-primary-500/80 to-violet-500/90 text-neutral-100">
						Create a new profiling session
					</Badge>
				</div>
				<p className="max-w-2xl text-sm text-muted-foreground">
					If something fails mid-flow, you can retry from the same screen without reselecting every resume.
				</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				{steps.map((step) => (
					<Card key={step.id} className="group relative overflow-hidden border-dashed shadow-m transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-l dark:hover:border-transparent">
						<CardHeader className="gap-2">
							<CardTitle className="flex items-center gap-2 text-base font-semibold">
								<span className="flex size-7 items-center justify-center rounded-full bg-muted font-medium shadow-m transition-colors group-hover:bg-primary/10 group-hover:text-primary">
									{step.id}
								</span>
								{step.title}
							</CardTitle>
							<CardDescription>{step.description}</CardDescription>
						</CardHeader>
					</Card>
				))}
			</div>
		</motion.section>
	)
}
