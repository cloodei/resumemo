/**
 * Compute a fast fingerprint of a file for deduplication.
 *
 * Strategy: read the first 8 KB and last 8 KB of the file, concatenate them,
 * and SHA-256 hash the result. Combined with the file's size and mimeType
 * this is virtually collision-proof while staying near-instant even on
 * large files.
 *
 * For files smaller than 16 KB the entire content is hashed.
 */

const CHUNK_SIZE = 8 * 1024 // 8 KB

async function readChunk(file: File, start: number, end: number) {
	const slice = file.slice(start, end)
	return slice.arrayBuffer()
}

export async function computeFingerprint(file: File) {
	let buffer: ArrayBuffer

	if (file.size <= CHUNK_SIZE * 2) {
		// Small file — hash the whole thing
		buffer = await file.arrayBuffer()
	} else {
		const [head, tail] = await Promise.all([
			readChunk(file, 0, CHUNK_SIZE),
			readChunk(file, file.size - CHUNK_SIZE, file.size),
		])

		const combined = new Uint8Array(head.byteLength + tail.byteLength)
		combined.set(new Uint8Array(head), 0)
		combined.set(new Uint8Array(tail), head.byteLength)
		buffer = combined.buffer
	}

	const hashBuffer = await crypto.subtle.digest("SHA-256", buffer)
	const hashArray = Array.from(new Uint8Array(hashBuffer))
	return hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
}
