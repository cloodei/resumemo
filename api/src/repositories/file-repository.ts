import { and, desc, eq, sql } from "drizzle-orm";

import * as schema from "@resumemo/core/schemas";

import { db } from "~/lib/db";
import { repositoryCache } from "~/lib/repository-cache";

const listFilesByUserStatement = db
	.select()
	.from(schema.resumeFile)
	.where(eq(schema.resumeFile.userId, sql.placeholder("userId")))
	.orderBy(desc(schema.resumeFile.createdAt))
	.prepare("file_list_by_user");

const getOwnedFileStatement = db
	.select()
	.from(schema.resumeFile)
	.where(
		and(
			eq(schema.resumeFile.id, sql.placeholder("fileId")),
			eq(schema.resumeFile.userId, sql.placeholder("userId")),
		),
	)
	.prepare("file_get_owned");

const getFileReferenceCountStatement = db
	.select({ id: schema.profilingSessionFile.id })
	.from(schema.profilingSessionFile)
	.where(eq(schema.profilingSessionFile.fileId, sql.placeholder("fileId")))
	.prepare("file_get_reference_count");

const deleteFileStatement = db
	.delete(schema.resumeFile)
	.where(eq(schema.resumeFile.id, sql.placeholder("fileId")))
	.returning({ id: schema.resumeFile.id })
	.prepare("file_delete_by_id");

export type FileRepositoryError = {
	code: "file-not-found" | "file-in-use";
	message: string;
};

export function isFileRepositoryError(value: unknown): value is FileRepositoryError {
	if (!value || typeof value !== "object")
		return false;

	return "code" in value && "message" in value;
}

export const fileRepositoryCacheKeys = {
	list: (userId: string) => `file:list:${userId}` as const,
	entity: (userId: string, fileId: number) => `file:entity:${userId}:${fileId}` as const,
};

export const fileRepository = {
	async listByUser(userId: string) {
		return await repositoryCache.getOrLoad(
			fileRepositoryCacheKeys.list(userId),
			async () => {
				const files = await listFilesByUserStatement.execute({ userId });

				for (const file of files)
					repositoryCache.set(fileRepositoryCacheKeys.entity(userId, file.id), file);

				return { files };
			},
		);
	},

	async getOwned(userId: string, fileId: number) {
		const cached = repositoryCache.get<Awaited<ReturnType<typeof getOwnedFileStatement.execute>>[number]>(
			fileRepositoryCacheKeys.entity(userId, fileId),
		);
		if (cached)
			return cached;

		const files = await getOwnedFileStatement.execute({ userId, fileId });
		const file = files[0] ?? null;
		if (file)
			repositoryCache.set(fileRepositoryCacheKeys.entity(userId, fileId), file);

		return file;
	},

	async deleteOwned(userId: string, fileId: number) {
		const file = await this.getOwned(userId, fileId);
		if (!file)
			return { code: "file-not-found", message: "File not found" } satisfies FileRepositoryError;

		const refs = await getFileReferenceCountStatement.execute({ fileId });
		if (refs.length > 0)
			return { code: "file-in-use", message: "File is used by one or more sessions" } satisfies FileRepositoryError;

		await deleteFileStatement.execute({ fileId });

		repositoryCache.delete(fileRepositoryCacheKeys.entity(userId, fileId));
		repositoryCache.update<{
			files: Awaited<ReturnType<typeof listFilesByUserStatement.execute>>;
		}>(fileRepositoryCacheKeys.list(userId), current => ({
			files: current.files.filter((entry: typeof file) => entry.id !== fileId),
		}));

		return { file };
	},
};
