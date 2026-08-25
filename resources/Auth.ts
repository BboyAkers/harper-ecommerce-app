import { type Context, logger, Resource, server } from 'harper';
import { badRequest, conflict, forbidden, unauthorized } from './lib/errors.ts';
import { CUSTOMER_ROLE, ensureRoles } from './lib/roles.ts';

/**
 * Session-based authentication on Harper's built-in users and roles.
 *
 * Harper issues a session cookie from `context.login()`, so the storefront needs
 * no token handling — it posts credentials once and the browser carries the
 * cookie from then on. (`authentication.enableSessions` defaults to true.)
 *
 * Note on argument order: a Resource's `post` is dispatched as `post(data, query)`
 * unless the class sets `static loadAsInstance = false`, in which case it is
 * `post(target, data)`. These use the default, so the request body comes first.
 *
 * Note on `allowCreate`/`allowRead`: for an authenticated request Harper consults
 * these *before* dispatching the method, and the base Resource denies by default —
 * so without them a signed-in customer gets 403 on their own /Me. They are marked
 * deprecated in 5.2.5, but they remain the enforcement point, so each one opens the
 * endpoint and the method below does the real authorization.
 */

const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

/**
 * `getContext()` is typed as `Context | SourceContext`; only the request-side
 * Context carries `login` and `session`, so narrow to it in one place.
 */
function asRequestContext(context: unknown): Context {
	return context as Context;
}

/** Validate credentials out of an untrusted body. */
function readCredentials(body: unknown): { username: string; password: string } {
	if (!body || typeof body !== 'object') badRequest('username and password are required');
	const { username, password } = body as { username?: unknown; password?: unknown };
	if (typeof username !== 'string' || typeof password !== 'string' || username.trim() === '' || password === '') {
		badRequest('username and password are required');
	}
	return { username: username.trim(), password };
}

/** What the client is told about the signed-in user. */
function describeUser(user: { username?: string; role?: { role?: string } }) {
	return { username: user.username, role: user.role?.role };
}

/**
 * POST /SignUp — create a customer account and sign it in.
 *
 * SECURITY: `add_user` requires super_user, and there is no authenticated user
 * at signup time. `server.operation()` called without a context runs with
 * authorization bypassed (`bypassAuth = !authorize` in Harper's dispatch), which
 * is what makes self-serve registration possible at all.
 *
 * That bypass is total — it skips the permission check for every operation — so
 * the role below is hard-coded and never read from the request. Accepting a
 * client-supplied role here would let anyone register themselves as super_user.
 */
export class SignUp extends Resource {
	// Registration is open to anonymous visitors; the method validates the input.
	allowCreate() {
		return true;
	}

	async post(data: unknown) {
		const { username, password } = readCredentials(await data);

		if (!USERNAME_PATTERN.test(username)) {
			badRequest('Username must be 3-32 characters using letters, numbers, dot, underscore or hyphen');
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
		}

		try {
			await server.operation(
				{
					operation: 'add_user',
					username,
					password,
					role: CUSTOMER_ROLE, // never from the request body — see the note above
					active: true,
				},
				undefined,
			);
		} catch (error) {
			// Harper answers 409 when the username is taken. Re-message that; let
			// anything else propagate rather than masking a real failure.
			if ((error as { statusCode?: number })?.statusCode === 409) {
				conflict('That username is already taken');
			}
			throw error;
		}

		await signIn(asRequestContext(this.getContext()), username, password);
		return { username, role: CUSTOMER_ROLE };
	}
}

/** POST /SignIn — exchange credentials for a session cookie. */
export class SignIn extends Resource {
	// Signing in must be reachable without already being signed in.
	allowCreate() {
		return true;
	}

	async post(data: unknown) {
		const { username, password } = readCredentials(await data);
		await signIn(asRequestContext(this.getContext()), username, password);

		const user = this.getCurrentUser();
		return user ? describeUser(user) : { username };
	}
}

/** POST /SignOut — end the current session. */
export class SignOut extends Resource {
	// Any caller may reach this; the method 401s when there is no session to end.
	allowCreate() {
		return true;
	}

	async post() {
		const { session } = asRequestContext(this.getContext());
		if (!session) unauthorized('Not signed in');

		// Clear the user off the session rather than removing the row — this is what
		// Harper's own `logout` operation does (security/auth.ts). The published
		// `Session` type advertises a `delete(id)` method, but the runtime object is a
		// plain spread of the session record and has no such method; calling it throws
		// "session.delete is not a function".
		await session.update({ user: null });
		return { signedOut: true };
	}
}

/** GET /Me — who the current session belongs to. */
export class Me extends Resource {
	// Any caller may reach this; the method 401s when nobody is signed in.
	allowRead() {
		return true;
	}

	async get() {
		const user = this.getCurrentUser();
		if (!user) unauthorized('Not signed in');
		return describeUser(user);
	}
}

/** Establish a session, mapping any credential failure to a single 403. */
async function signIn(context: Context, username: string, password: string): Promise<void> {
	if (!context.login) {
		// Only reachable if authentication.enableSessions is turned off.
		throw new Error('Cookie sessions are not enabled on this Harper instance');
	}
	try {
		await context.login(username, password);
	} catch {
		// Deliberately does not distinguish an unknown user from a wrong password.
		forbidden('Invalid username or password');
	}
	await commitSession(context);
}

/**
 * Wait for the session row that `context.login()` writes.
 *
 * `login` calls `session.update(...)` and does *not* await the resulting put
 * (Harper's security/auth.ts), so it can resolve — and the Set-Cookie response
 * can go out — before the session record has committed. A client that uses the
 * cookie on its very next request then reads back as anonymous. Re-issuing the
 * same update and awaiting it closes that window; the session id is already
 * fixed by then, so this rewrites the row rather than creating a second one.
 *
 * Nothing but timing depends on this, which is exactly why it is worth a note:
 * without it the integration suite fails roughly one run in three, and only on
 * the request that immediately follows a sign-in.
 */
async function commitSession(context: Context): Promise<void> {
	const user = context.user;
	if (!user || !context.session) return;
	// Harper stores whatever `login` derived: the record id when there is one,
	// otherwise the username (which is the users table's primary key).
	const id = (user as { getId?: () => string }).getId?.() ?? user.username;
	await context.session.update({ user: id });
}

// Roles must exist before anyone can register. Component load has no authenticated
// user, so this goes through the same authorization bypass described above.
ensureRoles().catch((error) => logger.error?.('Failed to ensure application roles', error));
