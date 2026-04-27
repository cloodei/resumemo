import { Bookmark, ClipboardList } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { SessionFormData } from "@/stores/upload-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type JobDescriptionTemplate = {
	id: string
	name: string
	jobTitle: string | null
	rawText: string
	useCount: number
	lastUsedAt: string | Date | null
}

type NewSessionRoleFormProps = {
	isBusy: boolean
	errors: {
		sessionName?: { message?: string }
		jobDescription?: { message?: string }
	}
	templates: JobDescriptionTemplate[]
	selectedTemplateId?: string
	onUseTemplate: (template: JobDescriptionTemplate) => void
	register: (name: keyof SessionFormData, options?: unknown) => Record<string, unknown>
}

export function NewSessionRoleForm({
	isBusy,
	errors,
	templates,
	selectedTemplateId,
	onUseTemplate,
	register,
}: NewSessionRoleFormProps) {
	const frequentTemplates = templates.slice(0, 4)

	return (
		<Card className="border-none shadow-x">
			<CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 pb-4 dark:border-border/30">
				<div>
					<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Role brief</CardTitle>
					<CardDescription className="mt-1 text-sm">Describe what a strong candidate should look like.</CardDescription>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid gap-3">
					<div className="flex items-center justify-between">
						<label className="text-sm font-medium text-foreground" htmlFor="session-name">Session name</label>
						{errors.sessionName?.message && <span className="text-xs text-destructive">{errors.sessionName.message}</span>}
					</div>
					<Input
						id="session-name"
						placeholder="e.g. Q1 Frontend Hiring"
						className="h-11"
						disabled={isBusy}
						{...register("sessionName", {
							required: "Session name is required",
							minLength: { value: 3, message: "Min 3 characters" },
						})}
					/>
				</div>

				<div className="grid gap-3">
					<label className="text-sm font-medium text-foreground" htmlFor="job-title">Job title</label>
					<Input id="job-title" placeholder="e.g. Staff Product Designer" className="h-11" disabled={isBusy} {...register("jobTitle")} />
				</div>

				{frequentTemplates.length > 0 && (
					<div className="grid gap-3">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-sm font-medium text-foreground">Your frequently used JDs</p>
								<p className="text-xs text-muted-foreground">Pick one to autofill, then edit if this run needs a different brief.</p>
							</div>
							<Bookmark className="size-4 text-muted-foreground" />
						</div>
						<div className="grid gap-2">
							{frequentTemplates.map(template => (
								<button
									key={template.id}
									type="button"
									disabled={isBusy}
									onClick={() => onUseTemplate(template)}
									className="group rounded-md border border-border/60 bg-muted/20 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-60"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="truncate text-sm font-semibold text-foreground">{template.name}</p>
											<p className="mt-1 truncate text-xs text-muted-foreground">{template.jobTitle || "Custom role"}</p>
										</div>
										<Badge variant={selectedTemplateId === template.id ? "default" : "secondary"} className="shrink-0">
											{template.useCount} use{template.useCount === 1 ? "" : "s"}
										</Badge>
									</div>
								</button>
							))}
						</div>
					</div>
				)}

				<div className="grid gap-3">
					<label className="text-sm font-medium text-foreground" htmlFor="job-description">Job description</label>
					<Textarea
						id="job-description"
						placeholder="Describe responsibilities, must-haves, preferred strengths, and hiring context..."
						className="min-h-[180px] resize-none"
						disabled={isBusy}
						{...register("jobDescription", {
							required: "Job description is required",
							maxLength: { value: 5000, message: "Max 5000 characters" },
						})}
					/>
					{errors.jobDescription?.message && <span className="text-xs text-destructive">{errors.jobDescription.message}</span>}
				</div>

				{frequentTemplates.length === 0 && (
					<div className="rounded-md border border-dashed border-border/70 bg-muted/20 p-4">
						<div className="flex items-start gap-3">
							<div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-background">
								<ClipboardList className="size-4 text-muted-foreground" />
							</div>
							<div>
								<p className="text-sm font-medium text-foreground">Reusable JDs appear here after your first session.</p>
								<p className="mt-1 text-xs leading-5 text-muted-foreground">Resumemo saves each distinct JD once and reuses it for matching future sessions.</p>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
