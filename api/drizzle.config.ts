import { defineConfig } from "drizzle-kit"
import { apiEnv } from "./src/config/env"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: apiEnv.database.url
  }
})
