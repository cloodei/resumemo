import type { FileStatus } from "@/stores/upload-store"

export const newSessionSteps = [
	{
		id: 1,
		title: "Describe the role",
		description: "Add the session name, title, and hiring context.",
	},
	{
		id: 2,
		title: "Add resumes",
		description: "Drag in PDF, DOCX, or TXT files once.",
	},
	{
		id: 3,
		title: "Launch profiling",
		description: "If something fails, you can retry instead of starting over.",
	},
] as const

export const jobDescriptionTemplates = [
	{
		title: "Senior Frontend Engineer",
		summary: "React, TypeScript, accessibility, testing, and design systems.",
	},
	{
		title: "AI Research Scientist",
		summary: "Model evaluation, experimentation, deployment readiness, and cross-functional communication.",
	},
] as const

export const phaseLabel = {
	idle: "",
	uploading: "Uploading resumes...",
	creating: "Creating the profiling session...",
	upload_error: "Some uploads failed. Retry only the failed files.",
	create_error: "We couldn't start processing. Please try again.",
	done: "Session created. Redirecting...",
} as const

export function fileStatusLabel(status: FileStatus, errorMessage?: string) {
	switch (status) {
		case "ready":
			return "Ready to upload"
		case "uploading":
			return "Uploading"
		case "done":
			return "Uploaded"
		case "failed":
			return errorMessage ?? "Upload failed"
	}
}
