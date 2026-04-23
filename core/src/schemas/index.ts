import { randomUUIDv7 } from "bun"
import {
	pgTable,
	pgSchema,
	text,
	timestamp,
	boolean,
	uuid,
	index,
	varchar,
	bigint,
	bigserial,
	numeric,
	jsonb,
	uniqueIndex,
} from "drizzle-orm/pg-core"
import type {
	ScreeningCandidateProfile,
	ScreeningJobDescriptionArtifact,
	ScreeningResumeArtifact,
	ScreeningScoreArtifact,
} from "./screening-artifacts"

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
})

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
])

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
])

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
})

export const resumeFile = pgTable("resume_file", {
	id: bigserial("id", { mode: "number" }).primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	originalName: varchar("original_name", { length: 512 }).notNull(),
	mimeType: varchar("mime_type", { length: 128 }).notNull(),
	size: bigint("size", { mode: "bigint" }).notNull(),
	storageKey: varchar("storage_key", { length: 1024 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
}, (table) => [
	index().on(table.userId),
])

export const profilingSessionFile = pgTable("profiling_session_file", {
	id: bigserial("id", { mode: "number" }).primaryKey(),
	sessionId: uuid("session_id")
		.notNull()
		.references(() => profilingSession.id, { onDelete: "cascade" }),
	fileId: bigint("file_id", { mode: "number" })
		.notNull()
		.references(() => resumeFile.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
}, (table) => [
	index().on(table.sessionId),
	index().on(table.fileId),
	uniqueIndex("profiling_session_file_session_file_unique").on(table.sessionId, table.fileId),
])

export const sessionStatusEnum = ["processing", "retrying", "completed", "failed"] as const

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
	status: varchar("status", { length: 32, enum: sessionStatusEnum }).notNull().default("processing"),
	totalFiles: bigint("total_files", { mode: "number" }).notNull().default(0),
	activeRunId: uuid("active_run_id"),
	errorMessage: text("error_message"),
	lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
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
])

export const candidateResult = pgTable("candidate_result", {
	id: uuid("id")
		.$defaultFn(randomUUIDv7)
		.primaryKey(),
	sessionId: uuid("session_id")
		.notNull()
		.references(() => profilingSession.id, { onDelete: "cascade" }),
	fileId: bigint("file_id", { mode: "number" })
		.notNull()
		.references(() => resumeFile.id, { onDelete: "cascade" }),
	runId: uuid("run_id").notNull(),
	candidateName: varchar("candidate_name", { length: 255 }),
	candidateEmail: varchar("candidate_email", { length: 320 }),
	candidatePhone: varchar("candidate_phone", { length: 32 }),
	rawText: text("raw_text").notNull(),
	parsedProfile: jsonb("parsed_profile").notNull(),
	overallScore: numeric("overall_score", { precision: 5, scale: 2 }).notNull(),
	scoreBreakdown: jsonb("score_breakdown").notNull(),
	summary: text("summary").notNull(),
	skillsMatched: jsonb("skills_matched").notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
}, (table) => [
	index().on(table.sessionId, table.runId),
	uniqueIndex("candidate_result_run_file_unique").on(table.runId, table.fileId),
])

export const screeningDb = pgSchema("screening")
export const screeningJobDescriptionSourceEnum = ["inline", "template"] as const
export const screeningSessionStatusEnum = ["processing", "retrying", "completed", "failed"] as const

export const screeningJobDescription = screeningDb.table("job_description", {
	id: uuid("id")
		.$defaultFn(randomUUIDv7)
		.primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	name: varchar("name", { length: 255 }).notNull(),
	jobTitle: varchar("job_title", { length: 255 }),
	rawText: text("raw_text").notNull(),
	source: varchar("source", { length: 32, enum: screeningJobDescriptionSourceEnum }).notNull().default("inline"),
	latestArtifact: jsonb("latest_artifact").$type<ScreeningJobDescriptionArtifact | null>(),
	lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
}, (table) => [
	index().on(table.userId),
	index().on(table.lastUsedAt),
])

export const screeningSession = screeningDb.table("session", {
	id: uuid("id")
		.$defaultFn(randomUUIDv7)
		.primaryKey(),
	userId: uuid("user_id")
		.notNull()
		.references(() => user.id, { onDelete: "cascade" }),
	jobDescriptionId: uuid("job_description_id")
		.notNull()
		.references(() => screeningJobDescription.id, { onDelete: "restrict" }),
	name: varchar("name", { length: 255 }).notNull(),
	jobTitleSnapshot: varchar("job_title_snapshot", { length: 255 }),
	status: varchar("status", { length: 32, enum: screeningSessionStatusEnum }).notNull().default("processing"),
	totalFiles: bigint("total_files", { mode: "number" }).notNull().default(0),
	activeRunId: uuid("active_run_id"),
	errorMessage: text("error_message"),
	jobDescriptionArtifact: jsonb("job_description_artifact").$type<ScreeningJobDescriptionArtifact | null>(),
	lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
}, (table) => [
	index().on(table.userId),
	index().on(table.jobDescriptionId),
	index().on(table.status),
])

export const screeningSessionFile = screeningDb.table("session_file", {
	id: bigserial("id", { mode: "number" }).primaryKey(),
	sessionId: uuid("session_id")
		.notNull()
		.references(() => screeningSession.id, { onDelete: "cascade" }),
	fileId: bigint("file_id", { mode: "number" })
		.notNull()
		.references(() => resumeFile.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
}, (table) => [
	index().on(table.sessionId),
	index().on(table.fileId),
	uniqueIndex("screening_session_file_session_file_unique").on(table.sessionId, table.fileId),
])

export const screeningCandidate = screeningDb.table("candidate", {
	id: uuid("id")
		.$defaultFn(randomUUIDv7)
		.primaryKey(),
	sessionId: uuid("session_id")
		.notNull()
		.references(() => screeningSession.id, { onDelete: "cascade" }),
	fileId: bigint("file_id", { mode: "number" })
		.notNull()
		.references(() => resumeFile.id, { onDelete: "cascade" }),
	runId: uuid("run_id").notNull(),
	candidateName: varchar("candidate_name", { length: 255 }),
	candidateEmail: varchar("candidate_email", { length: 320 }),
	candidatePhone: varchar("candidate_phone", { length: 32 }),
	rawText: text("raw_text").notNull(),
	resumeArtifact: jsonb("resume_artifact").$type<ScreeningResumeArtifact | null>(),
	candidateProfile: jsonb("candidate_profile").$type<ScreeningCandidateProfile>().notNull(),
	scoreArtifact: jsonb("score_artifact").$type<ScreeningScoreArtifact>().notNull(),
	overallScore: numeric("overall_score", { precision: 5, scale: 2 }).notNull(),
	baseScore: numeric("base_score", { precision: 5, scale: 2 }).notNull(),
	bonusScore: numeric("bonus_score", { precision: 5, scale: 2 }).notNull(),
	summary: text("summary").notNull(),
	skillsMatched: jsonb("skills_matched").$type<string[]>().notNull().default([]),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
}, (table) => [
	index().on(table.sessionId, table.runId),
	uniqueIndex("screening_candidate_run_file_unique").on(table.runId, table.fileId),
])

export const profilingV3JobDescriptionSourceEnum = screeningJobDescriptionSourceEnum
export const sessionStatusV3Enum = screeningSessionStatusEnum
export const profilingJobDescriptionV3 = screeningJobDescription
export const profilingSessionV3 = screeningSession
export const profilingSessionFileV3 = screeningSessionFile
export const candidateResultV3 = screeningCandidate

export * from "./screening-artifacts"
