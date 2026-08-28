/**
 * Integration tests for authentication and the public/authenticated boundary.
 *
 * These run with `authentication.authorizeLocal: false`, unlike the other suites.
 * The harness normally starts Harper with `--AUTHENTICATION_AUTHORIZELOCAL=true`,
 * which authorizes every loopback request as super_user and makes the access rules
 * impossible to observe. `HARPER_SET_CONFIG` (what the fixture's `config` option
 * feeds) is force-precedence and overrides that CLI flag, so anonymous really means
 * anonymous here — which is the only way to assert any of this.
 */
import { teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { ok, strictEqual } from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, suite, test } from 'node:test';
import { adminAuth, adminOperation, restUrl, startAppHarper, VALID_CUSTOMER } from './helpers/app-fixture.ts';
import { get, PASSWORD, post, register } from './helpers/session.ts';

suite('authentication', (ctx: ContextWithHarper) => {
	let fixtureDir: string;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx, {
			config: { authentication: { authorizeLocal: false } },
		}));
	});

	after(async () => {
		await teardownHarper(ctx);
		await rm(fixtureDir, { recursive: true, force: true });
	});

	test('the loopback super_user bypass is actually off', async () => {
		// If this fails every other assertion in this suite is meaningless, because
		// anonymous requests would silently be super_user.
		const response = await get(ctx.harper, '/Me');
		strictEqual(response.status, 401, 'anonymous /Me must not resolve to a user');
	});

	test('creates the customer and editor roles on startup', async () => {
		const roles = (await adminOperation(ctx.harper, { operation: 'list_roles' })) as { role: string }[];
		const names = roles.map((role) => role.role);
		ok(names.includes('customer'), `expected a customer role, got ${names.join(', ')}`);
		ok(names.includes('editor'), `expected an editor role, got ${names.join(', ')}`);
	});

	test('registers a customer and signs them in', async () => {
		const cookie = await register(ctx.harper, 'ada.customer@example.com');
		ok(cookie, 'sign-up should establish a session');

		const me = await get(ctx.harper, '/Me', cookie);
		strictEqual(me.status, 200);
		const identity = (await me.json()) as { username: string; role: string };
		strictEqual(identity.username, 'ada.customer@example.com');
		strictEqual(identity.role, 'customer');
	});

	test('leaves the new session usable on the very next request', async () => {
		// `context.login()` fires the session write without awaiting it, so the
		// Set-Cookie response can beat the committed session record and the next
		// request reads back as anonymous. `resources/Auth.ts` waits for that write;
		// a single attempt reproduced the race about one run in three, so loop.
		for (let attempt = 0; attempt < 5; attempt++) {
			const cookie = await register(ctx.harper, `race.attempt${attempt}@example.com`);
			const me = await get(ctx.harper, '/Me', cookie);
			strictEqual(me.status, 200, `attempt ${attempt}: a fresh session must already identify its user`);
		}
	});

	test('never lets a registration choose its own role', async () => {
		// The signup path runs with authorization bypassed, so the role must be
		// hard-coded. If this regresses, anyone can register as super_user.
		const { response } = await post(ctx.harper, '/SignUp', {
			email: 'mallory.escalate@example.com',
			password: PASSWORD,
			role: 'super_user',
		});
		ok(response.ok, `sign-up should succeed, got ${response.status}`);

		const users = (await adminOperation(ctx.harper, { operation: 'list_users' })) as {
			username: string;
			role?: { role?: string };
		}[];
		const mallory = users.find((user) => user.username === 'mallory.escalate@example.com');
		strictEqual(mallory?.role?.role, 'customer', 'a self-registered user must always be a customer');
	});

	test('rejects weak or malformed registrations', async () => {
		const short = await post(ctx.harper, '/SignUp', { email: 'grace.short@example.com', password: 'short' });
		strictEqual(short.response.status, 400);

		const missing = await post(ctx.harper, '/SignUp', { email: 'grace.nopass@example.com' });
		strictEqual(missing.response.status, 400);

		// An account is its email address, so anything that cannot be one is refused
		// before it reaches `add_user` — which has no format constraint of its own.
		for (const email of ['not an email', 'grace.hopper', 'grace@', '@example.com', 'grace@example', 'a@b..com']) {
			const { response } = await post(ctx.harper, '/SignUp', { email, password: PASSWORD });
			strictEqual(response.status, 400, `"${email}" is not an email address and must be rejected`);
		}
	});

	test('treats an address as case-insensitive', async () => {
		// The username is the users table's primary key, so a second account under a
		// different casing could never be merged back into the first.
		await register(ctx.harper, 'Ada.Case@Example.com');

		const duplicate = await post(ctx.harper, '/SignUp', { email: 'ada.case@example.com', password: PASSWORD });
		strictEqual(duplicate.response.status, 409, 'a differently-cased address is the same account');

		const { response, cookie } = await post(ctx.harper, '/SignIn', {
			email: 'ADA.CASE@EXAMPLE.COM',
			password: PASSWORD,
		});
		ok(response.ok, `sign-in should accept any casing, got ${response.status}`);
		const identity = (await (await get(ctx.harper, '/Me', cookie)).json()) as { username: string };
		strictEqual(identity.username, 'ada.case@example.com', 'the stored address is normalised to lower case');
	});

	test('rejects a duplicate email with 409', async () => {
		await register(ctx.harper, 'grace.hopper@example.com');
		const { response } = await post(ctx.harper, '/SignUp', {
			email: 'grace.hopper@example.com',
			password: PASSWORD,
		});
		strictEqual(response.status, 409);
	});

	test('rejects a wrong password without revealing whether the user exists', async () => {
		await register(ctx.harper, 'alan.turing@example.com');

		const wrongPassword = await post(ctx.harper, '/SignIn', { email: 'alan.turing@example.com', password: 'nope' });
		const unknownUser = await post(ctx.harper, '/SignIn', { email: 'nobody.here@example.com', password: 'nope' });

		strictEqual(wrongPassword.response.status, 403);
		strictEqual(unknownUser.response.status, 403, 'an unknown user must look the same as a bad password');
	});

	test('signs out so the session no longer identifies the user', async () => {
		const cookie = await register(ctx.harper, 'edsger.dijkstra@example.com');
		strictEqual((await get(ctx.harper, '/Me', cookie)).status, 200);

		const { response } = await post(ctx.harper, '/SignOut', undefined, cookie);
		ok(response.ok, `sign-out should succeed, got ${response.status}`);

		strictEqual((await get(ctx.harper, '/Me', cookie)).status, 401, 'the session must stop identifying the user');
	});

	test('keeps the product catalog readable without signing in', async () => {
		const response = await get(ctx.harper, '/Product/yx1-earphones');
		strictEqual(response.status, 200, 'the catalog is public');
	});

	test('still allows guest checkout', async () => {
		const { response } = await post(ctx.harper, '/Order/', {
			customer: VALID_CUSTOMER,
			paymentMethod: 'cash-on-delivery',
			items: [{ slug: 'yx1-earphones', quantity: 1 }],
		});
		ok(response.ok, `anonymous checkout should still work, got ${response.status}`);
		const order = (await response.json()) as { ownerUsername?: string };
		strictEqual(order.ownerUsername, undefined, 'a guest order has no owner');
	});

	test('records the signed-in customer as the order owner', async () => {
		const cookie = await register(ctx.harper, 'ada.buyer@example.com');
		const { response } = await post(
			ctx.harper,
			'/Order/',
			{ customer: VALID_CUSTOMER, paymentMethod: 'cash-on-delivery', items: [{ slug: 'yx1-earphones', quantity: 1 }] },
			cookie,
		);
		ok(response.ok, `checkout should succeed, got ${response.status}`);
		const order = (await response.json()) as { ownerUsername?: string };
		strictEqual(order.ownerUsername, 'ada.buyer@example.com');
	});

	test('requires authentication to read orders back', async () => {
		const response = await fetch(restUrl(ctx.harper, '/Order/'), { headers: { Accept: 'application/json' } });
		ok(response.status === 401 || response.status === 403, `anonymous order listing should be denied, got ${response.status}`);

		const asAdmin = await fetch(restUrl(ctx.harper, '/Order/'), {
			headers: { Accept: 'application/json', Authorization: adminAuth(ctx.harper) },
		});
		strictEqual(asAdmin.status, 200, 'an authorized reader can list orders');
	});
});
