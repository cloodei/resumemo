import { Resend } from "resend"
// import { drizzle } from "drizzle-orm/bun-sql"
import { drizzle } from "drizzle-orm/bun-sql"

export const db = drizzle(process.env.DATABASE_URL!)
export const resend = new Resend(process.env.RESEND_API_KEY!)
