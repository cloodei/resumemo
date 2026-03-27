import { MemoryCache } from "./cache";
import type {
	SessionSort,
	SessionFileView,
	SessionListItem,
	SessionResultSummary,
	SessionResultDetail,
} from "~/types";

const REPOSITORY_CACHE_TTL_MS = 15 * 60 * 1000;
const REPOSITORY_CACHE_MAX_ENTRIES = 1_000_000;

export type CacheKey<T> = string & {
	readonly __cacheValue?: T;
};

export function createCacheKey<T>(key: string): CacheKey<T> {
	return key as CacheKey<T>;
}

const repositoryMemoryCache = new MemoryCache<string, unknown>({
	defaultTtlMs: REPOSITORY_CACHE_TTL_MS,
	maxEntries: REPOSITORY_CACHE_MAX_ENTRIES,
});

type LoadOptions<T> = {
	ttlMs?: number;
	shouldCache?: (value: T) => boolean;
};

function get<T>(key: CacheKey<T>): T | undefined;
function get<T>(key: string): T | undefined;
function get<T>(key: string): T | undefined {
	try {
		return repositoryMemoryCache.get(key) as T | undefined;
	}
	catch {
		return undefined;
	}
}

function set<T>(key: CacheKey<T>, value: T, ttlMs?: number): T;
function set<T>(key: string, value: T, ttlMs?: number): T;
function set<T>(key: string, value: T, ttlMs?: number): T {
	return repositoryMemoryCache.set(key, value, ttlMs) as T;
}

function update<T>(
	key: CacheKey<T>,
	updater: (currentValue: T) => T | undefined,
	ttlMs?: number,
): T | undefined;
function update<T>(
	key: string,
	updater: (currentValue: T) => T | undefined,
	ttlMs?: number,
): T | undefined;

function update<T>(
	key: string,
	updater: (currentValue: T) => T | undefined,
	ttlMs?: number,
): T | undefined {
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
}

function getOrLoad<T>(
	key: CacheKey<T>,
	loader: () => Promise<T>,
	options?: LoadOptions<T>,
): Promise<T>;
function getOrLoad<T>(
	key: string,
	loader: () => Promise<T>,
	options?: LoadOptions<T>,
): Promise<T>;
async function getOrLoad<T>(
	key: string,
	loader: () => Promise<T>,
	options?: LoadOptions<T>,
): Promise<T> {
	return await repositoryMemoryCache.getOrSet(
		key,
		async () => await loader() as unknown,
		options?.ttlMs,
		options?.shouldCache as ((value: unknown) => boolean) | undefined,
	) as T;
}

export const repositoryCache = {
	get,
	set,
	update,
	getOrLoad,

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
	entity: (sessionId: string) => createCacheKey<SessionListItem>(
		`session:entity:${sessionId}`
	),

	files: (sessionId: string) => createCacheKey<SessionFileView[]>(
		`session:files:${sessionId}`
	),

	list: (userId: string) => createCacheKey<SessionListItem[]>(
		`session:list:${userId}`
	),

	resultsData: (sessionId: string, sort: SessionSort, activeRunId: string | null) => createCacheKey<SessionResultSummary[]>(
		`session:results-data:${sessionId}:${sort}:${activeRunId ?? "none"}`
	),

	result: (sessionId: string, resultId: string, activeRunId: string | null) => createCacheKey<SessionResultDetail>(
		`session:result:${sessionId}:${resultId}:${activeRunId ?? "none"}`
	),
}
