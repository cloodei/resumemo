import { describe, expect, test } from "bun:test";

import { MemoryCache } from "./cache";

describe("MemoryCache", () => {
	test("returns stored values before expiry", () => {
		const cache = new MemoryCache<string, number>({ defaultTtlMs: 50, maxEntries: 10 });

		cache.set("answer", 42);

		expect(cache.get("answer")).toBe(42);
	});

	test("returns undefined after expiry", async () => {
		const cache = new MemoryCache<string, string>({ defaultTtlMs: 5, maxEntries: 10 });

		cache.set("short", "lived");
		await Bun.sleep(10);

		expect(cache.get("short")).toBeUndefined();
	});

	test("deletes one or many keys", () => {
		const cache = new MemoryCache<string, string>({ defaultTtlMs: 100, maxEntries: 10 });

		cache.set("a", "1");
		cache.set("b", "2");
		cache.delete("a");
		cache.deleteMany(["b"]);

		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBeUndefined();
	});

	test("loads and stores on cache miss", async () => {
		const cache = new MemoryCache<string, number>({ defaultTtlMs: 100, maxEntries: 10 });
		let calls = 0;

		const value = await cache.getOrSet("count", async () => {
			calls += 1;
			return 7;
		});

		expect(value).toBe(7);
		expect(calls).toBe(1);
		expect(cache.get("count")).toBe(7);
	});

	test("shares one in-flight loader per key", async () => {
		const cache = new MemoryCache<string, number>({ defaultTtlMs: 100, maxEntries: 10 });
		let calls = 0;

		const loader = async () => {
			calls += 1;
			await Bun.sleep(10);
			return 99;
		};

		const [first, second] = await Promise.all([
			cache.getOrSet("same", loader),
			cache.getOrSet("same", loader),
		]);

		expect(first).toBe(99);
		expect(second).toBe(99);
		expect(calls).toBe(1);
	});

	test("evicts the oldest entry when max entries is exceeded", () => {
		const cache = new MemoryCache<string, number>({ defaultTtlMs: 100, maxEntries: 2 });

		cache.set("a", 1);
		cache.set("b", 2);
		cache.set("c", 3);

		expect(cache.get("a")).toBeUndefined();
		expect(cache.get("b")).toBe(2);
		expect(cache.get("c")).toBe(3);
	});

	test("does not cache loader failures", async () => {
		const cache = new MemoryCache<string, number>({ defaultTtlMs: 100, maxEntries: 10 });

		await expect(cache.getOrSet("boom", async () => {
			throw new Error("nope");
		})).rejects.toThrow("nope");

		expect(cache.get("boom")).toBeUndefined();
	});

	test("does not allow undefined cache values", () => {
		const cache = new MemoryCache<string, string | undefined>({ defaultTtlMs: 100, maxEntries: 10 });

		expect(() => cache.set("empty", undefined)).toThrow("does not support undefined values");
	});

	test("deletes entries by predicate", () => {
		const cache = new MemoryCache<string, number>({ defaultTtlMs: 100, maxEntries: 10 });

		cache.set("session:a", 1);
		cache.set("session:b", 2);
		cache.set("other:c", 3);
		cache.deleteWhere(key => key.startsWith("session:"));

		expect(cache.get("session:a")).toBeUndefined();
		expect(cache.get("session:b")).toBeUndefined();
		expect(cache.get("other:c")).toBe(3);
	});
});
