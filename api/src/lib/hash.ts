const hasher = new Bun.CryptoHasher("sha256");

/**
 * Compute the SHA-256 hash of a buffer and return it as a 64-character hex string.
 */
export function computeSHA256(data: Uint8Array) {
	hasher.update(data);
	return hasher.digest("hex");
}
