import { Elysia, t } from "elysia";

import { deleteFile } from "../lib/storage";
import { authMiddleware } from "../lib/auth";
import { fileRepository, isFileRepositoryError } from "~/repositories/file-repository";

export const fileRoutes = new Elysia({ prefix: "/api/files" })
	.use(authMiddleware)
	/**
	 * List all files for the authenticated user (for reuse UI in future).
	 */
	.get("/", async ({ user }) => await fileRepository.listByUser(user.id), { auth: true })

	/**
	 * Delete a file from R2 and DB.
	 * Only allowed if the file is not referenced by any session.
	 */
	.delete("/:id", async ({ user, params, set }) => {
		const deletion = await fileRepository.deleteOwned(user.id, params.id);
		if (isFileRepositoryError(deletion)) {
			set.status = deletion.code === "file-not-found" ? 404 : 409;
			return { status: "error", message: deletion.message };
		}

		try {
			await deleteFile(deletion.file.storageKey);
		} catch {
			// Best-effort R2 deletion
		}

		return { status: "ok" };
	}, {
		auth: true,
		params: t.Object({
			id: t.Number(),
		}),
	});
