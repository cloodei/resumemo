const hasher = new Bun.CryptoHasher("sha256");

export function computeSHA256(data: Uint8Array | string) {
	hasher.update(data);
	return hasher.digest("hex");
}
