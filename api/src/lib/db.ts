import { drizzle } from "drizzle-orm/postgres-js"
// import { drizzle } from "drizzle-orm/bun-sql"
import { apiEnv } from "~/config/env"

export const db = drizzle(apiEnv.database.url)
