import { motion } from "motion/react"
import { BriefcaseBusiness, Clock, FileAxis3D, LaptopMinimalCheck } from "lucide-react"

import type { DashboardMetric } from "@/features/dashboard/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const metricIcons = [LaptopMinimalCheck, BriefcaseBusiness, Clock, FileAxis3D]

type DashboardMetricsProps = {
	metrics: readonly DashboardMetric[]
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
			{metrics.map((metric, index) => {
				const Icon = metricIcons[index]
				return (
					<motion.div
						key={metric.label}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: index * 0.1, duration: 0.5 }}
					>
						<Card
							className="group relative overflow-hidden border-none shadow-x transition-all duration-300 hover:-translate-y-1"
							title={metric.change}
						>
							<div className="absolute inset-0 bg-linear-to-br from-primary/2 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
							<CardHeader className="relative pb-2">
								<div className="flex items-center justify-between">
									<CardTitle className="text-base font-medium text-muted-foreground transition-colors group-hover:text-foreground">
										{metric.label}
									</CardTitle>
									<Icon className="size-4 text-muted-foreground/50" />
								</div>
								<CardDescription className="text-xs whitespace-nowrap overflow-hidden text-ellipsis">{metric.change}</CardDescription>
							</CardHeader>
							<CardContent className="relative">
								<p className="bg-linear-to-br from-foreground to-foreground/80 bg-clip-text text-3xl font-bold tracking-tight text-foreground">{metric.value}</p>
							</CardContent>
						</Card>
					</motion.div>
				)
			})}
		</div>
	)
}
