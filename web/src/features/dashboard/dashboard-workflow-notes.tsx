import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function DashboardWorkflowNotes() {
	return (
		<Card className="flex h-full flex-col border-none shadow-md">
			<CardHeader className="border-b border-border/30 pb-4">
				<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Workflow Notes</CardTitle>
				<CardDescription className="text-sm mt-1">Quick reminders for how screening work behaves across the app.</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col pt-6">
				<Tabs defaultValue="pipelines" className="flex-1">
					<TabsList>
						<TabsTrigger value="pipelines" className="border-none">Background jobs</TabsTrigger>
						<TabsTrigger value="models" className="border-none">Review flow</TabsTrigger>
					</TabsList>
					<TabsContent value="pipelines" className="mt-4 space-y-3 text-sm text-muted-foreground">
						<div className="group rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-l dark:bg-muted/20 dark:hover:bg-muted/30">
							<p className="font-semibold text-foreground transition-colors group-hover:text-primary">Leave and come back</p>
							<p className="mt-1.5 text-xs text-muted-foreground">New and retried sessions keep running in the background, so reviewers do not need to stay on a loading screen.</p>
						</div>
						<div className="group rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-l dark:bg-muted/20 dark:hover:bg-muted/30">
							<p className="font-semibold text-foreground transition-colors group-hover:text-primary">Retry without rework</p>
							<p className="mt-1.5 text-xs text-muted-foreground">Uploads and completed sessions can be retried or duplicated without reselecting every resume file.</p>
						</div>
					</TabsContent>
					<TabsContent value="models" className="mt-4 space-y-3 text-sm text-muted-foreground">
						<div className="group rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-l dark:bg-muted/20 dark:hover:bg-muted/30">
							<p className="font-semibold text-foreground transition-colors group-hover:text-primary">Review the shortlist first</p>
							<p className="mt-1.5 text-xs text-muted-foreground">Completed sessions now highlight candidate summaries, experience, contact details, and manual review notes before anything else.</p>
						</div>
						<div className="group rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 hover:bg-muted/40 hover:shadow-l dark:bg-muted/20 dark:hover:bg-muted/30">
							<p className="font-semibold text-foreground transition-colors group-hover:text-primary">Choose the right retry path</p>
							<p className="mt-1.5 text-xs text-muted-foreground">Use retry in place for a refreshed run, or create a new copy when you want to preserve prior outcomes.</p>
						</div>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	)
}
