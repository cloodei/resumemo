import { twMerge } from "tailwind-merge"
import { clsx, type ClassValue } from "clsx"

export const baseURL = import.meta.env.VITE_AUTH_SERVER_URL ?? "http://localhost:8080"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
