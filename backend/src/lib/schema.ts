import { randomUUIDv7 } from "bun";
import { pgTable, text, timestamp, boolean, uuid, index } from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
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
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [index("session_userId_idx").on(table.userId)]);

export const account = pgTable("account", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  scope: text("scope"),
  password: text("password"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [index("account_userId_idx").on(table.userId)]);

export const verification = pgTable("verification", {
  id: uuid("id")
    .$defaultFn(randomUUIDv7)
    .primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .$onUpdate(() => new Date())
    .notNull(),
}, (table) => [index("verification_identifier_idx").on(table.identifier)]);
