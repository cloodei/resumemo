import { MemoryCache } from "./cache";

const REPOSITORY_CACHE_TTL_MS = 15 * 60 * 1000;
const REPOSITORY_CACHE_MAX_ENTRIES = 50_000;

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
