/**
 * Cookie-session helpers for the suites that run with `authorizeLocal: false`.
 *
 * Harper's session cookie is HttpOnly and set on the sign-in response, so tests
 * have to thread it through by hand — `fetch` keeps no cookie jar.
 */
import type { HarperContext } from '@harperfast/integration-testing';
import { ok } from 'node:assert/strict';
import { restUrl } from './app-fixture.ts';

export const PASSWORD = 'correct-horse-battery';

/** Pull the `name=value` pair out of a Set-Cookie response header. */
export function sessionCookie(response: Response): string | undefined {
	const header = response.headers.get('set-cookie');
	if (!header) return undefined;
	return header.split(';')[0];
}

/** POST JSON, optionally carrying a session cookie, returning the response plus any new cookie. */
export async function post(harper: HarperContext, path: string, body?: unknown, cookie?: string) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
	if (cookie) headers.Cookie = cookie;
	const response = await fetch(restUrl(harper, path), {
		method: 'POST',
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	return { response, cookie: sessionCookie(response) ?? cookie };
}

/** GET a path, optionally carrying a session cookie. */
export function get(harper: HarperContext, path: string, cookie?: string) {
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (cookie) headers.Cookie = cookie;
	return fetch(restUrl(harper, path), { headers });
}

/** Register a customer and return its session cookie. */
export async function register(harper: HarperContext, username: string) {
	const { response, cookie } = await post(harper, '/SignUp', { username, password: PASSWORD });
	ok(response.ok, `sign-up should succeed, got ${response.status}`);
	return cookie;
}
