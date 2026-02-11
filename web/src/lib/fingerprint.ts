/**
 * Compute a SHA-256 fingerprint for dedup.
 *
 * Uses the Web Crypto API (SubtleCrypto) for zero-dependency,
 * cross-platform SHA-256. Returns a 64-character hex string.
 */
export async function computeFingerprint(file: File): Promise<string> {
	const buffer = await file.arrayBuffer();
	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
	const hashArray = new Uint8Array(hashBuffer);

	let hex = "";
	for (let i = 0; i < hashArray.length; i++) {
		hex += hashArray[i].toString(16).padStart(2, "0");
	}

	return hex;
}
