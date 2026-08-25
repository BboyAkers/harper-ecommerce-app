// Harper's protocol handler turns an uncaught error into an HTTP response and
// reads `.statusCode` off it — a plain `.status` is ignored.

/** Throw a 400 with `message` as the response body. */
export function badRequest(message: string): never {
	throw withStatus(new Error(message), 400);
}

/** Throw a 401 — no authenticated user on a request that requires one. */
export function unauthorized(message = 'Authentication required'): never {
	throw withStatus(new Error(message), 401);
}

/** Throw a 403 — authenticated, but not allowed to do this. */
export function forbidden(message = 'Not permitted'): never {
	throw withStatus(new Error(message), 403);
}

/** Throw a 409 — the request conflicts with current state (e.g. insufficient stock). */
export function conflict(message: string): never {
	throw withStatus(new Error(message), 409);
}

function withStatus(error: Error, statusCode: number): Error & { statusCode: number } {
	const withCode = error as Error & { statusCode: number };
	withCode.statusCode = statusCode;
	return withCode;
}
