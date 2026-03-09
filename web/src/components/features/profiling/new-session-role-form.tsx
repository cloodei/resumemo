import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { SessionFormData } from "@/stores/upload-store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Template = {
	title: string
	summary: string
}

type NewSessionRoleFormProps = {
	isBusy: boolean
	canImportFromLibrary: boolean
	templates: readonly Template[]
	errors: {
		sessionName?: { message?: string }
		jobDescription?: { message?: string }
	}
	register: (name: keyof SessionFormData, options?: unknown) => Record<string, unknown>
	onUseTemplate: (template: Template) => void
}

export function NewSessionRoleForm({
	isBusy,
	canImportFromLibrary,
	templates,
	errors,
	register,
	onUseTemplate,
}: NewSessionRoleFormProps) {
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

				{/* <Tabs defaultValue="templates" className="pt-2">
					<TabsList>
						<TabsTrigger className="cursor-pointer border-none" value="templates">Templates</TabsTrigger>
						<TabsTrigger className="cursor-pointer border-none" value="history">Deprecated</TabsTrigger>
					</TabsList>
					<TabsContent value="templates" className="mt-4 grid gap-3 md:grid-cols-2">
						{templates.map((template) => (
							<div
								key={template.title}
								className="cursor-pointer rounded-lg bg-muted/30 p-4 shadow-m transition-all hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-l dark:bg-muted/20"
								onClick={() => onUseTemplate(template)}
							>
								<p className="font-semibold text-foreground">{template.title}</p>
								<p className="mt-2 text-xs leading-5 text-muted-foreground">{template.summary}</p>
								<Button size="sm" variant="ghost" className="mt-4 h-9 px-3">Use template</Button>
							</div>
						))}
					</TabsContent>
					<TabsContent value="history" className="mt-4 text-sm text-muted-foreground">
						Session history duplication is paused while the retryable flow stabilizes.
					</TabsContent>
				</Tabs> */}
			</CardContent>
		</Card>
	)
}
