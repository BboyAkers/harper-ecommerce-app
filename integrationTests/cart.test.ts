/**
 * Integration tests for the server-side cart.
 *
 * The cart is keyed by username, so "you may only touch your own" is a string
 * comparison rather than a lookup — but that only holds while the resource
 * actually reads the username from the session. Like the auth and order-scoping
 * suites, this runs with `authorizeLocal: false`, since otherwise every request
 * from this loopback process would be super_user and allowed to touch any cart.
 */
import { teardownHarper, type ContextWithHarper, type HarperContext } from '@harperfast/integration-testing';
import { ok, strictEqual } from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, suite, test } from 'node:test';
import { adminAuth, restUrl, startAppHarper } from './helpers/app-fixture.ts';
import { get, post, register } from './helpers/session.ts';

interface CartLine {
	slug: string;
	quantity: number;
}

interface CartResult {
	id: string;
	items: CartLine[];
	adjustments: { slug: string; requested: number; available: number }[];
}

/** Seeded stock levels this suite depends on (see data/products.json). */
const IN_STOCK = 'yx1-earphones'; // 42
const LOW_STOCK = 'xx59-headphones'; // 3
const SOLD_OUT = 'xx99-mark-one-headphones'; // 0

function send(harper: HarperContext, method: string, path: string, body?: unknown, cookie?: string) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
	if (cookie) headers.Cookie = cookie;
	return fetch(restUrl(harper, path), {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

/** PUT a cart and return the parsed result, asserting success. */
async function putCart(harper: HarperContext, username: string, items: CartLine[], cookie?: string) {
	const response = await send(harper, 'PUT', `/Cart/${username}`, { items }, cookie);
	const body = await response.text();
	ok(response.ok, `cart write should succeed, got ${response.status}: ${body}`);
	return JSON.parse(body) as CartResult;
}

async function readCart(harper: HarperContext, username: string, cookie?: string) {
	const response = await get(harper, `/Cart/${username}`, cookie);
	const body = await response.text();
	strictEqual(response.status, 200, `cart read should succeed, got ${response.status}: ${body}`);
	return JSON.parse(body) as CartResult;
}

suite('cart', (ctx: ContextWithHarper) => {
	let fixtureDir: string;
	let ada: string | undefined;
	let bob: string | undefined;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx, {
			config: { authentication: { authorizeLocal: false } },
		}));
		ada = await register(ctx.harper, 'ada.cart');
		bob = await register(ctx.harper, 'bob.cart');
	});

	after(async () => {
		await teardownHarper(ctx);
		await rm(fixtureDir, { recursive: true, force: true });
	});

	test('the loopback super_user bypass is actually off', async () => {
		strictEqual((await get(ctx.harper, '/Me')).status, 401);
	});

	test('grants both application roles access to the Cart table', async () => {
		// The roles predate the Cart table, so the bootstrap has to reconcile
		// existing roles rather than only create missing ones.
		const response = await fetch(ctx.harper.operationsAPIURL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json', Authorization: adminAuth(ctx.harper) },
			body: JSON.stringify({ operation: 'list_roles' }),
		});
		// Grants are keyed by database, and this app declares
		// `@table(database: "harper_ecommerce_app")` rather than using Harper's default `data`.
		// The name is spelled out rather than imported from `resources/lib/tables.ts`: a test that
		// reads the constant it is checking would follow a rename instead of catching one.
		const roles = (await response.json()) as {
			role: string;
			permission?: Record<string, { tables?: Record<string, { read?: boolean; insert?: boolean }> }>;
		}[];
		for (const name of ['customer', 'editor']) {
			const cart = roles.find((role) => role.role === name)?.permission?.harper_ecommerce_app?.tables?.Cart;
			ok(cart?.read && cart?.insert, `the ${name} role should be able to use a Cart, got ${JSON.stringify(cart)}`);
		}
	});

	test('starts a customer with an empty cart rather than a 404', async () => {
		const cart = await readCart(ctx.harper, 'ada.cart', ada);
		strictEqual(cart.id, 'ada.cart');
		strictEqual(cart.items.length, 0);
	});

	test('stores and reads back a cart', async () => {
		await putCart(ctx.harper, 'ada.cart', [{ slug: IN_STOCK, quantity: 2 }], ada);
		const cart = await readCart(ctx.harper, 'ada.cart', ada);
		strictEqual(cart.items.length, 1);
		strictEqual(cart.items[0].slug, IN_STOCK);
		strictEqual(cart.items[0].quantity, 2);
	});

	test('stores only slug and quantity, never a price', async () => {
		// A cart that remembered a price would be a cart that could quote a stale one.
		await putCart(
			ctx.harper,
			'ada.cart',
			[{ slug: IN_STOCK, quantity: 1, price: 1, shortName: 'free stuff' } as CartLine],
			ada,
		);
		const cart = await readCart(ctx.harper, 'ada.cart', ada);
		strictEqual(Object.keys(cart.items[0]).sort().join(','), 'quantity,slug');
	});

	test('replaces the whole cart on PUT', async () => {
		await putCart(ctx.harper, 'ada.cart', [{ slug: IN_STOCK, quantity: 2 }], ada);
		await putCart(ctx.harper, 'ada.cart', [{ slug: LOW_STOCK, quantity: 1 }], ada);
		const cart = await readCart(ctx.harper, 'ada.cart', ada);
		strictEqual(cart.items.length, 1);
		strictEqual(cart.items[0].slug, LOW_STOCK);
	});

	test('clamps a quantity above stock instead of rejecting the write', async () => {
		// Rejecting would strand a customer whose cart went stale: they could not
		// even remove the offending line.
		const result = await putCart(ctx.harper, 'ada.cart', [{ slug: LOW_STOCK, quantity: 9 }], ada);
		strictEqual(result.items[0].quantity, 3, 'should clamp to the seeded stock level');
		strictEqual(result.adjustments.length, 1);
		strictEqual(result.adjustments[0].slug, LOW_STOCK);
		strictEqual(result.adjustments[0].requested, 9);
		strictEqual(result.adjustments[0].available, 3);
	});

	test('drops a sold-out product from the cart', async () => {
		const result = await putCart(ctx.harper, 'ada.cart', [{ slug: SOLD_OUT, quantity: 1 }], ada);
		strictEqual(result.items.length, 0);
		strictEqual(result.adjustments[0].available, 0);
	});

	test('rejects an unknown slug with 400', async () => {
		const response = await send(ctx.harper, 'PUT', '/Cart/ada.cart', { items: [{ slug: 'no-such', quantity: 1 }] }, ada);
		strictEqual(response.status, 400);
	});

	test('rejects a malformed quantity with 400', async () => {
		for (const quantity of [0, -1, 1.5, 100, 'two']) {
			const response = await send(ctx.harper, 'PUT', '/Cart/ada.cart', { items: [{ slug: IN_STOCK, quantity }] }, ada);
			strictEqual(response.status, 400, `quantity ${quantity} should be rejected`);
		}
	});

	test('merges a guest cart into the stored one on POST, keeping the larger quantity', async () => {
		await putCart(ctx.harper, 'bob.cart', [{ slug: IN_STOCK, quantity: 2 }], bob);

		const response = await send(
			ctx.harper,
			'POST',
			'/Cart/bob.cart',
			{
				items: [
					{ slug: IN_STOCK, quantity: 1 },
					{ slug: LOW_STOCK, quantity: 1 },
				],
			},
			bob,
		);
		const body = await response.text();
		ok(response.ok, `merge should succeed, got ${response.status}: ${body}`);
		const merged = (JSON.parse(body) as CartResult).items;

		strictEqual(merged.length, 2);
		strictEqual(merged.find((line) => line.slug === IN_STOCK)?.quantity, 2, 'the larger quantity wins, not the sum');
		strictEqual(merged.find((line) => line.slug === LOW_STOCK)?.quantity, 1);
	});

	test('discards the cart on DELETE and still reads back as empty', async () => {
		// The row is removed, but a missing cart and an empty cart look the same to
		// a client, so nothing downstream has to care which it is.
		await putCart(ctx.harper, 'bob.cart', [{ slug: IN_STOCK, quantity: 1 }], bob);
		const response = await send(ctx.harper, 'DELETE', '/Cart/bob.cart', undefined, bob);
		ok(response.ok, `delete should succeed, got ${response.status}`);

		const cart = await readCart(ctx.harper, 'bob.cart', bob);
		strictEqual(cart.items.length, 0);
	});

	test('lets a customer keep using a cart they deleted', async () => {
		await send(ctx.harper, 'DELETE', '/Cart/bob.cart', undefined, bob);
		const result = await putCart(ctx.harper, 'bob.cart', [{ slug: IN_STOCK, quantity: 1 }], bob);
		strictEqual(result.items.length, 1);
	});

	test("refuses to read another customer's cart", async () => {
		await putCart(ctx.harper, 'ada.cart', [{ slug: IN_STOCK, quantity: 1 }], ada);
		// 404 rather than 403: usernames are guessable, so a 403 would confirm which
		// of them have carts.
		strictEqual((await get(ctx.harper, '/Cart/ada.cart', bob)).status, 404);
	});

	test("refuses to write another customer's cart", async () => {
		const response = await send(ctx.harper, 'PUT', '/Cart/ada.cart', { items: [] }, bob);
		strictEqual(response.status, 404);

		// And the victim's cart is untouched.
		const cart = await readCart(ctx.harper, 'ada.cart', ada);
		strictEqual(cart.items.length, 1);
	});

	test('refuses anonymous cart access outright', async () => {
		const read = await get(ctx.harper, '/Cart/ada.cart');
		ok(read.status === 401 || read.status === 403, `expected a denial, got ${read.status}`);

		const write = await send(ctx.harper, 'PUT', '/Cart/ada.cart', { items: [] });
		ok(write.status === 401 || write.status === 403, `expected a denial, got ${write.status}`);
	});

	test('keeps each customer their own cart', async () => {
		await putCart(ctx.harper, 'ada.cart', [{ slug: IN_STOCK, quantity: 3 }], ada);
		await putCart(ctx.harper, 'bob.cart', [{ slug: LOW_STOCK, quantity: 1 }], bob);

		strictEqual((await readCart(ctx.harper, 'ada.cart', ada)).items[0].slug, IN_STOCK);
		strictEqual((await readCart(ctx.harper, 'bob.cart', bob)).items[0].slug, LOW_STOCK);
	});

	test('survives a sign-out and sign-in with the cart intact', async () => {
		// The cart is keyed by username, not by session, so it outlives the cookie.
		await putCart(ctx.harper, 'ada.cart', [{ slug: IN_STOCK, quantity: 4 }], ada);
		await post(ctx.harper, '/SignOut', undefined, ada);

		const { cookie: fresh } = await post(ctx.harper, '/SignIn', {
			username: 'ada.cart',
			password: 'correct-horse-battery',
		});
		const cart = await readCart(ctx.harper, 'ada.cart', fresh);
		strictEqual(cart.items[0].quantity, 4);
		ada = fresh;
	});
});
