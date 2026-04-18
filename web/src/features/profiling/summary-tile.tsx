type SummaryTileProps = {
	label: string
	value: string | number
	subtext: string
}

export function SummaryTile({ label, value, subtext }: SummaryTileProps) {
	return (
		<div className="grid rounded-xl bg-muted/55 py-4 pl-3 pr-5 shadow-m transition-all hover:-translate-y-0.5">
			<p className="text-xs uppercase tracking-tight text-muted-foreground">{label}</p>
			<p className="mt-2 bg-linear-to-br from-foreground to-foreground/80 bg-clip-text text-2xl font-bold text-foreground">{value}</p>
			<p className="mt-1 text-xs text-muted-foreground">{subtext}</p>
		</div>
	)
}
