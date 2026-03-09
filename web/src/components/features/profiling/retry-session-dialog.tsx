import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

import { retryModeCopy, type RetryFormValues, type RetryMode } from "./session-utils"

type RetrySessionDialogProps = {
	open: boolean
	onOpenChange: (open: boolean) => void
	selectedRetryMode: RetryMode
	onSelectRetryMode: (mode: RetryMode) => void
	defaultValues: RetryFormValues
	onSubmit: (values: RetryFormValues) => Promise<void>
	isPending: boolean
}

export function RetrySessionDialog({
	open,
	onOpenChange,
	selectedRetryMode,
	onSelectRetryMode,
	defaultValues,
	onSubmit,
	isPending,
}: RetrySessionDialogProps) {
	const retryForm = useForm<RetryFormValues>({ values: defaultValues })
	const selectedRetryCopy = retryModeCopy[selectedRetryMode]

	const submitRetry = retryForm.handleSubmit(async (values) => {
		await onSubmit(values)
	})

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="lg:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Retry or recreate this session</DialogTitle>
					<DialogDescription>
						Choose whether to rerun the current session or create a new one using the same resumes.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-3 md:grid-cols-2">
					{(Object.entries(retryModeCopy) as Array<[RetryMode, typeof retryModeCopy[RetryMode]]>).map(([mode, copy]) => (
						<button
							key={mode}
							type="button"
							onClick={() => onSelectRetryMode(mode)}
							className={`rounded-xl border p-4 text-left transition-all ${selectedRetryMode === mode ? "border-primary bg-primary/5 shadow-m" : "border-border/60 bg-muted/20 hover:border-primary/30"}`}
						>
							<p className="font-medium text-foreground">{copy.label}</p>
							<p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
						</button>
					))}
				</div>

				<form className="space-y-4" onSubmit={submitRetry}>
					{selectedRetryCopy.requiresUpdates && (
						<div className="grid gap-4 rounded-xl border border-border/50 bg-muted/20 p-4">
							<div className="grid gap-2">
								<label className="text-sm font-medium text-foreground" htmlFor="retry-name">Session name</label>
								<Input id="retry-name" {...retryForm.register("name", { required: true })} />
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium text-foreground" htmlFor="retry-title">Job title</label>
								<Input id="retry-title" {...retryForm.register("jobTitle")} />
							</div>
							<div className="grid gap-2">
								<label className="text-sm font-medium text-foreground" htmlFor="retry-description">Job description</label>
								<Textarea id="retry-description" className="min-h-[180px] resize-none" {...retryForm.register("jobDescription", { required: true })} />
							</div>
						</div>
					)}

					<div className="rounded-xl bg-muted/30 p-4 text-sm text-muted-foreground">
						<p className="font-medium text-foreground">Selected action</p>
						<p className="mt-1">{selectedRetryCopy.description}</p>
					</div>

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>Cancel</Button>
						<Button type="submit" className="gap-2" disabled={isPending}>
							{isPending ? "Working..." : selectedRetryCopy.buttonLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
