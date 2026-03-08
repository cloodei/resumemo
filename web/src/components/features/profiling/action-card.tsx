type ActionCardProps = {
	title: string
	description: string
	onClick: () => void
}

export function ActionCard({ title, description, onClick }: ActionCardProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="w-full rounded-lg border border-border/50 bg-muted/20 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary/5"
		>
			<p className="font-medium text-foreground">{title}</p>
			<p className="mt-2 text-sm text-muted-foreground">{description}</p>
		</button>
	)
}
