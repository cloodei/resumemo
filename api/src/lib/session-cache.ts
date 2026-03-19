import { MemoryCache } from "./cache";

const SESSION_CACHE_TTL_MS = 90_000;

export const sessionCacheKeys = {
	list: (userId: string) => `session:list:${userId}` as const,
	detail: (userId: string, sessionId: string) => `session:detail:${userId}:${sessionId}` as const,
	results: (userId: string, sessionId: string, sort: "asc" | "desc") => `session:results:${userId}:${sessionId}:${sort}` as const,
	result: (userId: string, sessionId: string, resultId: string) => `session:result:${userId}:${sessionId}:${resultId}` as const,
};

export type SessionCacheValue =
	| { sessions: unknown[] }
	| { session: unknown; files: Array<{ id: number; originalName: string; mimeType: string; size: number }>; results: unknown }
	| { sessionId: string; sessionStatus: string; totalResults: number; results: unknown[] }
	| { result: unknown };

const sessionResponseCache = new MemoryCache<string, SessionCacheValue>({
	defaultTtlMs: SESSION_CACHE_TTL_MS,
	maxEntries: 5_000_000,
});

export async function getOrSetSessionCache<T>(
	key: string,
	loader: () => Promise<T>,
	shouldCache?: (value: T) => boolean,
): Promise<T> {
	return await sessionResponseCache.getOrSet(
		key,
		async () => await loader() as SessionCacheValue,
		undefined,
		shouldCache as ((value: SessionCacheValue) => boolean) | undefined,
	) as T;
}

export function invalidateSessionList(userId: string): void {
	sessionResponseCache.delete(sessionCacheKeys.list(userId));
}

export function invalidateSessionDetail(userId: string, sessionId: string): void {
	sessionResponseCache.delete(sessionCacheKeys.detail(userId, sessionId));
}

export function invalidateSessionResults(userId: string, sessionId: string): void {
	sessionResponseCache.deleteMany([
		sessionCacheKeys.results(userId, sessionId, "asc"),
		sessionCacheKeys.results(userId, sessionId, "desc"),
	]);

	sessionResponseCache.deleteWhere(key => key.startsWith(`session:result:${userId}:${sessionId}:`));
}

export function invalidateSessionResult(userId: string, sessionId: string, resultId: string): void {
	sessionResponseCache.delete(sessionCacheKeys.result(userId, sessionId, resultId));
}

export function invalidateSessionNamespace(userId: string, sessionId: string): void {
	invalidateSessionDetail(userId, sessionId);
	invalidateSessionResults(userId, sessionId);
}
