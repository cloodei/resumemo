import { Elysia, t } from "elysia";
import { and, desc, eq } from "drizzle-orm";

import * as schema from "@shared/schemas";

import { db } from "../lib/db";
import { deleteFile } from "../lib/storage";
import { authMiddleware } from "../lib/auth";

const fileRoutes = new Elysia({ prefix: "/api/files" })
	.use(authMiddleware)
	/**
	 * List all files for the authenticated user (for reuse UI in future).
	 */
	.get("/", async ({ user }) => {
		const files = await db
			.select()
			.from(schema.resumeFile)
			.where(eq(schema.resumeFile.userId, user.id))
			.orderBy(desc(schema.resumeFile.createdAt));

		return { files };
	}, { auth: true })

	/**
	 * Delete a file from R2 and DB.
	 * Only allowed if the file is not referenced by any session.
	 */
	.delete("/:id", async ({ user, params, set }) => {
		const [file] = await db
			.select()
			.from(schema.resumeFile)
			.where(and(
				eq(schema.resumeFile.id, params.id),
				eq(schema.resumeFile.userId, user.id),
			));

		if (!file) {
			set.status = 404;
			return { status: "error", message: "File not found" };
		}

		// Check if any session references this file
		const refs = await db.select({ id: schema.profilingSessionFile.id })
			.from(schema.profilingSessionFile)
			.where(eq(schema.profilingSessionFile.fileId, params.id));

		if (refs.length > 0) {
			set.status = 409;
			return { status: "error", message: "File is used by one or more sessions" };
		}

		try {
			await deleteFile(file.storageKey);
		} catch {
			// Best-effort R2 deletion
		}

		await db
			.delete(schema.resumeFile)
			.where(eq(schema.resumeFile.id, params.id));

		return { status: "ok" };
	}, {
		auth: true,
		params: t.Object({
			id: t.Number(),
		}),
	});

export { fileRoutes };
