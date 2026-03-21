import { MemoryCache } from "./cache";
import { type SessionSort } from "~/utils/types";

const REPOSITORY_CACHE_TTL_MS = 15 * 60 * 1000;
const REPOSITORY_CACHE_MAX_ENTRIES = 500_000;

const repositoryMemoryCache = new MemoryCache<string, unknown>({
	defaultTtlMs: REPOSITORY_CACHE_TTL_MS,
	maxEntries: REPOSITORY_CACHE_MAX_ENTRIES,
});

type LoadOptions<T> = {
	ttlMs?: number;
	shouldCache?: (value: T) => boolean;
};

export const repositoryCache = {
	get<T>(key: string) {
		try {
			return repositoryMemoryCache.get(key) as T | undefined;
		}
		catch {
			return undefined;
		}
	},

	set<T>(key: string, value: T, ttlMs?: number) {
		return repositoryMemoryCache.set(key, value, ttlMs) as T;
	},

	update<T>(
		key: string,
		updater: (currentValue: T) => T | undefined,
		ttlMs?: number,
	) {
		try {
			return repositoryMemoryCache.update(
				key,
				currentValue => updater(currentValue as T) as unknown,
				ttlMs,
			) as T | undefined;
		}
		catch {
			return undefined;
		}
	},

	async getOrLoad<T>(key: string, loader: () => Promise<T>, options?: LoadOptions<T>) {
		return await repositoryMemoryCache.getOrSet(
			key,
			async () => await loader() as unknown,
			options?.ttlMs,
			options?.shouldCache as ((value: unknown) => boolean) | undefined,
		) as T;
	},

	delete(key: string) {
		repositoryMemoryCache.delete(key);
	},

	deleteMany(keys: Iterable<string>) {
		repositoryMemoryCache.deleteMany(keys);
	},

	deleteWhere(predicate: (key: string) => boolean) {
		repositoryMemoryCache.deleteWhere(predicate);
	},
};

export const sessionRepositoryCacheKeys = {
	entity: (sessionId: string) => `session:entity:${sessionId}` as const,
	files: (sessionId: string) => `session:files:${sessionId}` as const,
	list: (userId: string) => `session:list:${userId}` as const,
	detail: (userId: string, sessionId: string) => `session:detail:${userId}:${sessionId}` as const,
	results: (userId: string, sessionId: string, sort: SessionSort) => `session:results:${userId}:${sessionId}:${sort}` as const,
	resultsData: (sessionId: string, sort: SessionSort, activeRunId: string | null) => `session:results-data:${sessionId}:${sort}:${activeRunId ?? "none"}` as const,
	result: (userId: string, sessionId: string, resultId: string) => `session:result:${userId}:${sessionId}:${resultId}` as const,
	resultEntity: (sessionId: string, resultId: string) => `result:entity:${sessionId}:${resultId}` as const,
}
