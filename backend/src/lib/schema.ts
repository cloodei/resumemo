import { randomUUIDv7 } from "bun";
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().$defaultFn(randomUUIDv7),
  name: varchar({ length: 128 }).notNull(),
  email: varchar({ length: 128 }).notNull().unique(),
  password: varchar({ length: 128 }).notNull(),
  created_at: timestamp({ withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp({ withTimezone: true }).defaultNow().notNull().$onUpdateFn(() => new Date()),
})
