export type UsecaseSuccess<T> = {
	ok: true
	data: T
	headers?: Record<string, string>
}

export type UsecaseFailure<TBody extends { status: "error"; message: string }> = {
	ok: false
	error: {
		httpStatus: number
		body: TBody
	}
}

// export type UsecaseResult<
// 	TData,
// 	TBody extends { status: "error"; message: string } = { status: "error"; message: string },
// > = UsecaseSuccess<TData> | UsecaseFailure<TBody>

export function usecaseSuccess<TData>(data: TData, headers?: Record<string, string>): UsecaseSuccess<TData> {
	return { ok: true, data, headers }
}

export function usecaseFailure<TBody extends { status: "error"; message: string }>(
	httpStatus: number,
	body: TBody,
): UsecaseFailure<TBody> {
	return {
		ok: false,
		error: {
			httpStatus,
			body,
		},
	}
}
