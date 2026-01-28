import { twMerge } from "tailwind-merge"
import { clsx, type ClassValue } from "clsx"

export const baseURL = process.env.NEXT_PUBLIC_AUTH_SERVER_URL ?? "http://localhost:8080"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
