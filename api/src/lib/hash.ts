const hasher = new Bun.CryptoHasher("sha256");
const md5Hasher = new Bun.CryptoHasher("md5");

export function computeSHA256(data: Uint8Array | string) {
	hasher.update(data);
	return hasher.digest("hex");
}

export function computeMD5(data: Uint8Array | string) {
	md5Hasher.update(data);
	return md5Hasher.digest("hex");
}
