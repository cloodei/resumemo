import { motion } from "motion/react"
import { CheckCircle2, FileText, Layers, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type NewSessionUploadPanelProps = {
	isBusy: boolean
	isDragging: boolean
	filesCount: number
	doneFilesCount: number
	failedFilesCount: number
	phase: "idle" | "uploading" | "creating" | "upload_error" | "create_error" | "done"
	maxFileMb: number
	maxFiles: number
	accept: string
	onDragOver: (event: React.DragEvent) => void
	onDragLeave: (event: React.DragEvent) => void
	onDrop: (event: React.DragEvent) => void
	onBrowse: () => void
	onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void
}

export function NewSessionUploadPanel({
	isBusy,
	isDragging,
	filesCount,
	doneFilesCount,
	failedFilesCount,
	phase,
	maxFileMb,
	maxFiles,
	accept,
	onDragOver,
	onDragLeave,
	onDrop,
	onBrowse,
	onFileChange,
}: NewSessionUploadPanelProps) {
	return (
		<Card className="border-dashed shadow-x">
			<CardHeader className="border-b border-border/30 pb-4">
				<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">Resume upload</CardTitle>
				<CardDescription className="mt-1 text-sm">Uploaded files stay reusable if session creation fails.</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				<motion.div
					onDragOver={onDragOver}
					onDragLeave={onDragLeave}
					onDrop={onDrop}
					whileHover={isBusy ? {} : { scale: 1.01 }}
					whileTap={isBusy ? {} : { scale: 0.995 }}
					className={`relative flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed bg-muted/30 p-8 text-center transition-colors duration-200 ${isBusy ? "pointer-events-none opacity-60" : "cursor-pointer"} ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/40 hover:border-primary/50 hover:bg-muted/50"}`}
					onClick={() => !isBusy && onBrowse()}
				>
					<input id="file-input" type="file" multiple accept={accept} onChange={onFileChange} className="hidden" disabled={isBusy} />
					<div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><UploadCloud className="size-6" /></div>
					<div className="space-y-2">
						<p className="text-sm font-medium text-foreground">Drag and drop resumes or click to browse</p>
						<p className="text-xs text-muted-foreground">PDF, DOCX, TXT up to {maxFileMb}MB each</p>
					</div>
					<div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
						<span className="inline-flex items-center gap-1"><Layers className="size-3" /> Up to {maxFiles} files</span>
						<span className="inline-flex items-center gap-1"><FileText className="size-3" /> Duplicate name and size check</span>
					</div>
					<Button size="sm" className="mt-2" disabled={isBusy} onClick={(event) => {
						event.stopPropagation()
						onBrowse()
					}}>
						Browse files
					</Button>
				</motion.div>

				{filesCount > 0 && (
					<div className="rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground">
						<p className="flex items-center gap-2 text-foreground">
							<CheckCircle2 className="size-4 text-emerald-500" />
							{filesCount} file{filesCount !== 1 ? "s" : ""} added
							{doneFilesCount > 0 && ` • ${doneFilesCount} already uploaded`}
						</p>
						{failedFilesCount > 0 && (
							<p className="mt-1 text-xs text-destructive">
								{failedFilesCount} file{failedFilesCount !== 1 ? "s" : ""} failed. Retry only those files or remove them.
							</p>
						)}
						{phase === "create_error" && (
							<p className="mt-1 text-xs text-muted-foreground">Uploads are already complete. You can retry creation immediately.</p>
						)}
					</div>
				)}
			</CardContent>
			<CardFooter className="justify-between text-xs text-muted-foreground">
				<span>Need help? Check the upload guide in the docs.</span>
			</CardFooter>
		</Card>
	)
}
