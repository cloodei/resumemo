import { randomUUIDv7 } from "bun";
import { pgTable, text, timestamp, boolean, uuid, index, varchar, integer, bigint } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: varchar("token", { length: 512 }).notNull().unique(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: varchar("user_agent", { length: 512 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index().on(table.userId),
]);

export const account = pgTable("account", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: varchar("account_id", { length: 255 }).notNull().unique(),
  providerId: varchar("provider_id", { length: 50 }).notNull(),
  accessToken: varchar("access_token", { length: 2048 }),
  refreshToken: varchar("refresh_token", { length: 2048 }),
  idToken: varchar("id_token", { length: 2048 }),
  scope: varchar("scope", { length: 512 }),
  password: varchar("password", { length: 255 }),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index().on(table.userId),
]);

export const verification = pgTable("verification", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  identifier: varchar("identifier", { length: 320 }).notNull(),
  value: varchar("value", { length: 1024 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const resumeFile = pgTable("resume_file", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  originalName: varchar("original_name", { length: 512 }).notNull(),
  mimeType: varchar("mime_type", { length: 128 }).notNull(),
  size: bigint("size", { mode: "bigint" }).notNull(),
  storageKey: varchar("storage_key", { length: 1024 }).notNull(),
  fingerprint: varchar("fingerprint", { length: 128 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index().on(table.userId),
  index().on(table.fingerprint),
]);

export const sessionStatusEnum = ["uploading", "ready", "processing", "completed", "failed"] as const;

export const profilingSession = pgTable("profiling_session", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  jobDescription: text("job_description").notNull(),
  jobTitle: varchar("job_title", { length: 255 }),
  status: varchar("status", { length: 32, enum: sessionStatusEnum }).notNull().default("uploading"),
  totalFiles: integer("total_files").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [
  index().on(table.userId),
  index().on(table.status),
]);

export const profilingSessionFile = pgTable("profiling_session_file", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => profilingSession.id, { onDelete: "cascade" }),
  fileId: uuid("file_id")
    .notNull()
    .references(() => resumeFile.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
}, (table) => [
  index().on(table.sessionId),
  index().on(table.fileId),
]);

export const userRelations = relations(user, ({ many }) => ({
  resumeFiles: many(resumeFile),
  profilingSessions: many(profilingSession),
}));

export const resumeFileRelations = relations(resumeFile, ({ one, many }) => ({
  user: one(user, {
    fields: [resumeFile.userId],
    references: [user.id],
  }),
  profilingSessions: many(profilingSessionFile),
}));

export const profilingSessionRelations = relations(profilingSession, ({ one, many }) => ({
  user: one(user, {
    fields: [profilingSession.userId],
    references: [user.id],
  }),
  files: many(profilingSessionFile),
}));

export const profilingSessionFileRelations = relations(profilingSessionFile, ({ one }) => ({
  session: one(profilingSession, {
    fields: [profilingSessionFile.sessionId],
    references: [profilingSession.id],
  }),
  file: one(resumeFile, {
    fields: [profilingSessionFile.fileId],
    references: [resumeFile.id],
  }),
}));
