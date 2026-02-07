import { twMerge } from "tailwind-merge"
import { clsx, type ClassValue } from "clsx"

export function formatFileSize(bytes: number) {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
