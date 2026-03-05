/**
 * Error message extraction utilities.
 *
 * The core problem: Eden Treaty errors, fetch errors, auth errors, and native
 * JS errors all carry their message in different shapes. Every call-site was
 * independently guessing how to dig the message out—and most gave up and
 * replaced it with a static string like "Something went wrong", which made
 * debugging impossible for both developers and users.
 *
 * These helpers normalise any thrown/returned value into a human-readable
 * string while preserving the original detail from the server.
 */

/**
 * Extract a usable error message from *anything* that could be thrown,
 * returned by Eden Treaty's `error` field, or caught in a generic `catch`.
 *
 * Handles (in priority order):
 *  1. `Error` instances — uses `.message`
 *  2. Eden Treaty error objects — `{ value: { message } }` or `{ message }`
 *  3. Plain objects with a `message` string
 *  4. Plain strings
 *  5. Everything else → the provided `fallback`
 *
 * @param error    The caught/returned error value
 * @param fallback What to show when the error carries no usable detail
 */
export function getErrorMessage(error: unknown, fallback = "An unexpected error occurred") {
	if (error instanceof Error)
		return error.message || fallback
	if (typeof error === "string")
		return error || fallback

	// Object with nested structure (Eden Treaty: { value: { message } })
	if (typeof error === "object" && error !== null) {
		const obj = error as Record<string, unknown>

		// Eden Treaty wraps the response body in `.value`
		if ("value" in obj && typeof obj.value === "object" && obj.value !== null) {
			const value = obj.value as Record<string, unknown>
			if (typeof value.message === "string" && value.message) {
				return value.message
			}
		}

		// Direct { message: "..." } (e.g. auth errors, plain API responses)
		if (typeof obj.message === "string" && obj.message) {
			return obj.message
		}

		// Some APIs return { error: "..." }
		if (typeof obj.error === "string" && obj.error) {
			return obj.error
		}
	}

	return fallback
}

/**
 * Convenience: extract the message from an Eden Treaty `error` field
 * which has the shape `{ status: number, value: { message, ... } } | null`.
 *
 * Returns `null` when there is no error so callers can use the pattern:
 *   const msg = getEdenErrorMessage(error)
 *   if (msg) toast.error(msg)
 */
export function getEdenErrorMessage(error: { status: number; value: unknown } | null | undefined) {
	if (!error)
		return null

	if (typeof error.value === "object" && error.value !== null) {
		const val = error.value as Record<string, unknown>
		if (typeof val.message === "string" && val.message) {
			return val.message
		}
	}

	if (typeof error.value === "string" && error.value)
		return error.value

	return `Request failed (${error.status})`
}
