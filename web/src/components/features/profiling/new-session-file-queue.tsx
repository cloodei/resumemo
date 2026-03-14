import { AnimatePresence, motion } from "motion/react"
import { ArrowRight, Ban, CheckCircle2, FileText, Loader2, RefreshCw, RotateCcw, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { UploadFile } from "@/stores/upload-store"
import { fileStatusLabel, phaseLabel } from "./new-session-utils"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type NewSessionFileQueueProps = {
	files: UploadFile[]
	phase: "idle" | "uploading" | "creating" | "upload_error" | "create_error" | "done"
	pendingUploadCount: number
	doneFilesCount: number
	isBusy: boolean
	canSubmit: boolean
	formatFileSize: (size: number) => string
	onRemoveFile: (id: number) => void
	onClearFiles: () => void
	onCancel: () => void
	onRetry: () => void
	onStartOver: () => void
	onRemoveFailedFiles: () => void
	fileStatusIcon: (status: UploadFile["status"]) => React.ReactNode
}

export function NewSessionFileQueue({
	files,
	phase,
	pendingUploadCount,
	doneFilesCount,
	isBusy,
	canSubmit,
	formatFileSize,
	onRemoveFile,
	onClearFiles,
	onCancel,
	onRetry,
	onStartOver,
	onRemoveFailedFiles,
	fileStatusIcon,
}: NewSessionFileQueueProps) {
	return (
		<AnimatePresence>
			{files.length > 0 && (
				<motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.3 }}>
					<Card className="border-none shadow-x">
						<CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 pb-4 dark:border-border/30">
							<div>
								<CardTitle className="text-lg font-semibold bg-linear-to-br from-foreground to-foreground/70 bg-clip-text">File queue</CardTitle>
								<CardDescription className="mt-1 text-sm">{files.length} file{files.length !== 1 ? "s" : ""} • {pendingUploadCount} still need upload • {doneFilesCount} reusable</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								{isBusy && <Badge variant="secondary" className="gap-1 text-xs"><Loader2 className="size-3 animate-spin" /> Working</Badge>}
								<Button variant="ghost" size="sm" onClick={onClearFiles} disabled={isBusy}>Clear all</Button>
							</div>
						</CardHeader>
						<CardContent className="pt-4">
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
								{files.map((file) => (
									<motion.div key={file.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.2 }} className="rounded-lg bg-muted/30 p-4 shadow-m dark:bg-muted/20">
										<div className="flex items-start justify-between gap-3">
											<div className="flex min-w-0 items-center gap-3">
												<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><FileText className="size-5 text-primary" /></div>
												<div className="min-w-0">
													<p className="truncate text-sm font-medium text-foreground">{file.originalName}</p>
													<p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
												</div>
											</div>
											<div className="flex shrink-0 items-center gap-1">
												{fileStatusIcon(file.status)}
												<Button variant="ghost" size="icon" className="size-7 hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemoveFile(file.id)} disabled={file.status === "uploading"}>
													<X className="size-4" />
												</Button>
											</div>
										</div>
										<div className="mt-3">
											<div className="flex justify-between text-[10px] text-muted-foreground">
												<span>{fileStatusLabel(file.status, file.errorMessage)}</span>
												{file.status === "uploading" && <span>{file.progress}%</span>}
											</div>
											{file.status === "uploading" && (
												<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
													<motion.div className="h-full rounded-full bg-sky-500" initial={{ width: 0 }} animate={{ width: `${file.progress}%` }} transition={{ duration: 0.2, ease: "easeOut" }} />
												</div>
											)}
											{file.status === "done" && (
												<div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"><div className="h-full w-full rounded-full bg-emerald-500" /></div>
											)}
										</div>
									</motion.div>
								))}
							</div>
						</CardContent>
						<CardFooter className="flex flex-col items-start justify-between gap-4 border-t bg-muted/20 py-4 sm:flex-row sm:items-center">
							<div className="flex items-center gap-3 text-sm text-muted-foreground">
								{isBusy ? <Loader2 className="size-4 animate-spin text-sky-500" /> : phase === "done" ? <CheckCircle2 className="size-4 text-emerald-500" /> : phase === "upload_error" || phase === "create_error" ? <X className="size-4 text-destructive" /> : null}
								<span>{phaseLabel[phase]}</span>
							</div>

							<div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
								{isBusy && <Button variant="destructive" className="gap-2" onClick={onCancel}><Ban className="size-4" />Stop</Button>}
								{phase === "upload_error" && (
									<>
										<Button variant="secondary" className="gap-2" onClick={onRetry}><RefreshCw className="size-4" />Retry failed uploads</Button>
										<Button variant="outline" className="gap-2" onClick={onRemoveFailedFiles}><X className="size-4" />Remove failed files</Button>
									</>
								)}
								{phase === "create_error" && <Button variant="secondary" className="gap-2" onClick={onRetry}><RefreshCw className="size-4" />Retry session creation</Button>}
								{(phase === "upload_error" || phase === "create_error") && <Button variant="ghost" className="gap-2" onClick={onStartOver}><RotateCcw className="size-4" />Start over</Button>}
								<Button className="gap-2" disabled={!canSubmit} onClick={onRetry}>
									{isBusy ? <><Loader2 className="size-4 animate-spin" />Working...</> : phase === "create_error" ? <><span>Retry session creation</span><ArrowRight className="size-4" /></> : phase === "upload_error" ? <><span>Retry failed uploads</span><ArrowRight className="size-4" /></> : <><span>Upload and create session</span><ArrowRight className="size-4" /></>}
								</Button>
							</div>
						</CardFooter>
					</Card>
				</motion.section>
			)}
		</AnimatePresence>
	)
}
