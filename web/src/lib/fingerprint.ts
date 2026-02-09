/**
 * Compute a full-file XXH64 fingerprint for deduplication.
 *
 * Uses xxhash-wasm for cross-platform compatibility (same library
 * is used server-side). Returns a 16-character zero-padded hex string.
 *
 * The WASM module is lazily initialised once and cached for reuse.
 */

import xxhash from "xxhash-wasm"

const hasher = await xxhash()

export async function computeFingerprint(file: File): Promise<string> {
	const buffer = await file.arrayBuffer()
	const data = new Uint8Array(buffer)
	const hash = hasher.h64Raw(data)
	return hash.toString(16).padStart(16, "0")
}
