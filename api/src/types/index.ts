export * from "./session";

export type RepositoryResult<T, E> = {
	ok: true;
	data: T
} | {
	ok: false;
	error: E
}
