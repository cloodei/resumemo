import xxhash from "xxhash-wasm";

const hasher = await xxhash();

/**
 * Compute the XXH64 hash of a buffer and return it as a
 * zero-padded 16-character hex string.
 */
export async function computeXXH64(data: Uint8Array): Promise<string> {
	return hasher.h64Raw(data).toString(16).padStart(16, "0");
}
