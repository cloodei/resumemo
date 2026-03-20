type MemoryCacheOptions = {
	defaultTtlMs: number;
	maxEntries: number;
};

type CacheEntry<V> = {
	value: V;
	expiresAt: number;
};

export class MemoryCache<K, V> {
	private readonly values = new Map<K, CacheEntry<V>>();
	private readonly pending = new Map<K, Promise<V>>();
	private readonly options: MemoryCacheOptions;

	constructor(options: MemoryCacheOptions) {
		this.options = options;
	}

	get(key: K): V | undefined {
		const entry = this.values.get(key);
		if (!entry)
			return undefined;

		if (this.isExpired(entry)) {
			this.values.delete(key);
			return undefined;
		}

		return entry.value;
	}

	set(key: K, value: V, ttlMs = this.options.defaultTtlMs): V {
		if (value === undefined)
			throw new Error("MemoryCache does not support undefined values");

		const expiresAt = Date.now() + ttlMs;

		// if (this.values.has(key))
		// 	this.values.delete(key);

		this.values.set(key, { value, expiresAt });
		this.ensureCapacity();

		return value;
	}

	update(
		key: K,
		updater: (currentValue: V) => V | undefined,
		ttlMs = this.options.defaultTtlMs,
	): V | undefined {
		const currentValue = this.get(key);
		if (currentValue === undefined)
			return undefined;

		const nextValue = updater(currentValue);
		if (nextValue === undefined) {
			this.delete(key);
			return undefined;
		}

		return this.set(key, nextValue, ttlMs);
	}

	delete(key: K): void {
		this.values.delete(key);
		this.pending.delete(key);
	}

	deleteMany(keys: Iterable<K>): void {
		for (const key of keys)
			this.delete(key);
	}

	deleteWhere(predicate: (key: K) => boolean): void {
		for (const key of this.values.keys())
			if (predicate(key))
				this.delete(key);

		for (const key of this.pending.keys())
			if (predicate(key))
				this.pending.delete(key);
	}

	async getOrSet(
		key: K,
		loader: () => Promise<V>,
		ttlMs = this.options.defaultTtlMs,
		shouldCache: (value: V) => boolean = () => true,
	): Promise<V> {
		try {
			const cached = this.get(key);
			if (cached !== undefined)
				return cached;
		}
		catch {
			// Best-effort cache reads.
		}

		try {
			const inFlight = this.pending.get(key);
			if (inFlight)
				return inFlight;
		}
		catch {
			// Best-effort pending lookup.
		}

		let promise: Promise<V>;

		promise = loader()
			.then((value) => {
				try {
					if (this.pending.get(key) === promise && shouldCache(value))
						this.set(key, value, ttlMs);
				}
				catch {
					// Best-effort cache writes.
				}

				return value;
			})
			.finally(() => {
				try {
					if (this.pending.get(key) === promise)
						this.pending.delete(key);
				}
				catch {
					// Best-effort pending cleanup.
				}
			});

		try {
			this.pending.set(key, promise);
		}
		catch {
			return promise;
		}

		return promise;
	}

	private isExpired(entry: CacheEntry<V>): boolean {
		return entry.expiresAt <= Date.now();
	}

	private ensureCapacity(): void {
		while (this.values.size > this.options.maxEntries) {
			const oldestKey = this.values.keys().next().value;
			if (oldestKey === undefined)
				break;

			this.values.delete(oldestKey);
		}
	}
}
