import { Elysia } from "elysia";

import { db } from "../lib/db";
import { authMiddleware } from "../lib/auth";
import * as schema from "@shared/schemas";

export const systemRoutes = new Elysia()
	.get("/", () => ({ status: "ok" }))
	.use(authMiddleware)

	.get("/api/me", ({ user, session }) => ({
		user,
		session,
	}), { auth: true })
	.get("/api/test", async () => {
		const [users, sessions, accounts, verifications] = await Promise.all([
			db.select().from(schema.user),
			db.select().from(schema.session),
			db.select().from(schema.account),
			db.select().from(schema.verification),
		]);
		return { users, sessions, accounts, verifications };
	})
	.get("/api/clear", async () => {
		/**
		 * TODO: Remove this endpoint
		 * ONLY FOR DEVELOPMENT
		 */
		await Promise.all([
			db.delete(schema.user),
			db.delete(schema.session),
			db.delete(schema.account),
			db.delete(schema.verification),
			db.delete(schema.resumeFile),
			db.delete(schema.profilingSessionFile),
			db.delete(schema.profilingSession),
		]);
		return { status: "ok" };
	})
