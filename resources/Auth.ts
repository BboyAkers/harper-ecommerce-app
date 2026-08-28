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

/**
 * Accounts are identified by email address: the storefront's sign-up and sign-in
 * forms ask for one, and it becomes the Harper username (the users table's
 * primary key), so `AuthUser.username`, `Order.ownerUsername` and `/Cart/<id>`
 * all carry an email from here on.
 *
 * The pattern is deliberately permissive — one `@`, a dotted domain, no spaces —
 * because the only thing worth rejecting here is input that cannot be an address
 * at all. A stricter regex reliably turns away real addresses, and the fully
 * correct grammar (RFC 5322) is not a regex worth carrying. 254 is the maximum
 * length an SMTP path can hold.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
const MAX_EMAIL_LENGTH = 254;
const MIN_PASSWORD_LENGTH = 8;

/**
 * `getContext()` is typed as `Context | SourceContext`; only the request-side
 * Context carries `login` and `session`, so narrow to it in one place.
 */
function asRequestContext(context: unknown): Context {
	return context as Context;
}

/**
 * Validate credentials out of an untrusted body.
 *
 * The address is lower-cased as well as trimmed. Domains are case-insensitive
 * and no mail provider treats the local part as case-sensitive in practice, so
 * without this `Ada@example.com` registers as a second account that the owner of
 * `ada@example.com` cannot tell apart — and, because the username is the users
 * table's primary key, cannot be merged back afterwards.
 */
function readCredentials(body: unknown): { email: string; password: string } {
	if (!body || typeof body !== 'object') badRequest('email and password are required');
	const { email, password } = body as { email?: unknown; password?: unknown };
	if (typeof email !== 'string' || typeof password !== 'string' || email.trim() === '' || password === '') {
		badRequest('email and password are required');
	}
	return { email: email.trim().toLowerCase(), password };
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
		const { email, password } = readCredentials(await data);

		if (email.length > MAX_EMAIL_LENGTH || !EMAIL_PATTERN.test(email)) {
			badRequest('Enter a valid email address');
		}
		if (password.length < MIN_PASSWORD_LENGTH) {
			badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
		}

		try {
			await server.operation(
				{
					operation: 'add_user',
					username: email,
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
				conflict('An account already exists for that email address');
			}
			throw error;
		}

		await signIn(asRequestContext(this.getContext()), email, password);
		return { username: email, role: CUSTOMER_ROLE };
	}
}

/** POST /SignIn — exchange credentials for a session cookie. */
export class SignIn extends Resource {
	// Signing in must be reachable without already being signed in.
	allowCreate() {
		return true;
	}

	async post(data: unknown) {
		// No format check: an account predating the move to email addresses should
		// still be able to sign in, and the credentials are checked against the
		// users table either way. Only registration decides what an account may be.
		const { email, password } = readCredentials(await data);
		await signIn(asRequestContext(this.getContext()), email, password);

		const user = this.getCurrentUser();
		return user ? describeUser(user) : { username: email };
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
		forbidden('Invalid email or password');
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
