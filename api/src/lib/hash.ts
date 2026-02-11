import { blake3 } from "@noble/hashes/blake3.js";
import { XXH3_128 } from "xxh3-ts";
import { xxh3 } from "@node-rs/xxhash";
import blake from "blake3";
import xxhash from "xxhash-wasm";

const shaHasher = new Bun.CryptoHasher("sha256");
const hasher = await xxhash();

/**
 * Compute the XXH64 hash of a buffer and return it as a
 * zero-padded 16-character hex string.
 */
export async function computeXXH64(data: Uint8Array) {
	return hasher.h64Raw(data).toString(16).padStart(16, "0");
}

export async function computeXXH64_1(files: Bun.BunFile[]) {
	return Promise.all(files.map(async (file) => hasher.h64Raw(await file.bytes()).toString(16).padStart(16, "0")));
}


export async function computeXXH3_1(files: Bun.BunFile[]) {
	return Promise.all(files.map(async (file) => XXH3_128(Buffer.from(await file.arrayBuffer())).toString(16).padStart(16, "0")));
}

export async function computeXXH3_2(files: Bun.BunFile[]) {
	const res = Array<string>(files.length);
	for (let i = 0; i < files.length; i++) {
		const data = await files[i].arrayBuffer();
		res[i] = XXH3_128(Buffer.from(data)).toString(16).padStart(16, "0");
	}

	return res;
}

export async function computeXXH3_3(files: Bun.BunFile[]) {
	return Promise.all(files.map(async (file) => xxh3.xxh128(await file.bytes()).toString(16).padStart(16, "0")));
}

export async function computeXXH3_4(files: Bun.BunFile[]) {
	const res = Array<string>(files.length);
	for (let i = 0; i < files.length; i++) {
		const data = await files[i].bytes();
		res[i] = xxh3.xxh128(data).toString(16).padStart(16, "0");
	}

	return res;
}


export async function computeSHA256_1(files: Bun.BunFile[]) {
	return Promise.all(files.map(async (file) => {
		for await (const chunk of file.stream())
			shaHasher.update(chunk);

		return shaHasher.digest("hex");
	}));
}

export async function computeSHA256_2(files: Bun.BunFile[]) {
	const res: string[] = [];
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		for await (const chunk of file.stream())
			shaHasher.update(chunk);

		const finalHash = shaHasher.digest("hex");
		res.push(finalHash);
	}

	return res;
}

export async function computeSHA256_3(files: Bun.BunFile[]) {
	return Promise.all(files.map(async (file) => {
		const data = await file.arrayBuffer();
		shaHasher.update(new Uint8Array(data));
		return shaHasher.digest("hex");
	}));
}

export async function computeSHA256_4(files: Bun.BunFile[]) {
	const res: string[] = [];
	for (const file of files) {
		const data = await file.bytes();
		shaHasher.update(data);
		res.push(shaHasher.digest("hex"));
	}
	return res;
}


export async function computeBLAKE3_1(files: Bun.BunFile[]) {
	return Promise.all(files.map(async (file) => blake3(await file.bytes()).toHex()));
}

export async function computeBLAKE3_2(files: Bun.BunFile[]) {
	return Promise.all(files.map(async (file) => blake.hash(await file.bytes()).toString("hex")));
}
