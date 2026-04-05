export type UsecaseSuccess<T, TH extends Record<string, string>> = {
	ok: true
	data: T
	headers?: TH
}

export type UsecaseFailure<
	TBody extends { status: "error"; message: string },
	TStatus extends number,
> = {
	ok: false
	error: {
		httpStatus: TStatus
		body: TBody
	}
}

export function usecaseSuccess<TData, TH extends Record<string, string>>(data: TData, headers?: TH): UsecaseSuccess<TData, TH> {
	return { ok: true, data, headers }
}

export function usecaseFailure<
	TStatus extends number,
	TBody extends { status: "error"; message: string },
>(
	httpStatus: TStatus,
	body: TBody,
): UsecaseFailure<TBody, TStatus> {
	return {
		ok: false,
		error: {
			httpStatus,
			body,
		},
	}
}
