/**
 * SHA-256 Benchmark: Streaming vs Buffered
 * Batch sizes up to 50 × 1 MB files.
 *
 * Usage:  bun run src/benchmark/run.ts
 */

import { join, resolve } from "node:path";
import * as h from "../lib/hash";

const DIR = resolve(import.meta.dir, "data");
const FILE_SIZE = 1 * 1024 * 1024;
const BATCHES = [5, 10, 20, 50];
const WARMUP = 3;
const ROUNDS = 30;

// ── Helpers ────────────────────────────────────────────────────────────────

async function genFiles(n: number) {
	await Bun.write(join(DIR, ".keep"), "");
	const paths: string[] = [];
	for (let i = 0; i < n; i++) {
		const p = join(DIR, `test_${i + 1}.bin`);
		const buf = new Uint8Array(FILE_SIZE);
		crypto.getRandomValues(buf);
		await Bun.write(p, buf);
		paths.push(p);
	}
	return paths;
}

const toBunFiles = (ps: string[]) => ps.map((p) => Bun.file(p));

type HashFn = (files: Bun.BunFile[]) => Promise<string[]>;

async function bench(fn: HashFn, paths: string[], rounds: number) {
	const times: number[] = [];
	for (let i = 0; i < rounds; i++) {
		const files = toBunFiles(paths);
		const t0 = performance.now();
		await fn(files);
		times.push(performance.now() - t0);
	}
	return times;
}

function stats(t: number[]) {
	const s = [...t].sort((a, b) => a - b);
	const n = s.length;
	const mean = s.reduce((a, b) => a + b, 0) / n;
	const med = n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
	const sd = Math.sqrt(s.reduce((a, v) => a + (v - mean) ** 2, 0) / n);
	return { mean, med, sd, min: s[0], max: s[n - 1], p95: s[Math.ceil(n * 0.95) - 1] };
}

function fmt(ms: number) {
	return ms < 1 ? `${(ms * 1000).toFixed(0)}µs` : `${ms.toFixed(2)}ms`;
}

// ── Variants ───────────────────────────────────────────────────────────────

const VARIANTS: { tag: string; fn: HashFn }[] = [
	{ tag: "SHA256_1  stream+parallel ", fn: h.computeSHA256_1 },
	{ tag: "SHA256_2  stream+seq      ", fn: h.computeSHA256_2 },
	{ tag: "SHA256_3  buffer+parallel ", fn: h.computeSHA256_3 },
	{ tag: "SHA256_4  buffer+seq      ", fn: h.computeSHA256_4 },
];

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
	console.log(`\n  SHA-256 Benchmark  |  ${ROUNDS} rounds  |  ${WARMUP} warmup  |  1 MB/file\n`);

	for (const count of BATCHES) {
		const totalMB = count;
		const paths = await genFiles(count);

		console.log(`── ${count} files (${totalMB} MB) ${"─".repeat(50)}`);
		console.log(
			`  ${"Variant".padEnd(26)}  ${"Mean".padStart(9)}  ${"Median".padStart(9)}  ${"StdDev".padStart(9)}  ${"Min".padStart(9)}  ${"p95".padStart(9)}  ${"MB/s".padStart(8)}`,
		);

		const means: { tag: string; mean: number }[] = [];

		for (const v of VARIANTS) {
			await bench(v.fn, paths, WARMUP);
			const t = await bench(v.fn, paths, ROUNDS);
			const s = stats(t);
			const mbps = (totalMB / (s.mean / 1000)).toFixed(0);

			console.log(
				`  ${v.tag}  ${fmt(s.mean).padStart(9)}  ${fmt(s.med).padStart(9)}  ${fmt(s.sd).padStart(9)}  ${fmt(s.min).padStart(9)}  ${fmt(s.p95).padStart(9)}  ${mbps.padStart(7)}/s`,
			);
			means.push({ tag: v.tag, mean: s.mean });
		}

		// Quick ranking
		const fastest = Math.min(...means.map((m) => m.mean));
		console.log();
		for (const m of means) {
			const r = m.mean / fastest;
			const bar = "█".repeat(Math.min(Math.round(r * 3), 30));
			console.log(`  ${m.tag}  ${bar} ${r === 1 ? "← fastest" : `${r.toFixed(2)}x`}`);
		}
		console.log();
	}

	console.log("  ✅ Done\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
