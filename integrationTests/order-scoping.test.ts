/**
 * Integration tests for row-level order scoping.
 *
 * Harper's role permissions are table-level: the `customer` role either can read
 * Orders or it cannot. "Only your own orders" is the resource's job, enforced by
 * the `rowFilter` in `resources/Order.ts`, and this suite is what holds that in
 * place — a regression here is a customer reading another customer's address and
 * payment details.
 *
 * Like the auth suite, this runs with `authorizeLocal: false`; otherwise every
 * request from this loopback test process would be super_user and would see
 * everything by design.
 */
import { teardownHarper, type ContextWithHarper, type HarperContext } from '@harperfast/integration-testing';
import { ok, strictEqual } from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, suite, test } from 'node:test';
import { adminAuth, restUrl, startAppHarper, VALID_CUSTOMER } from './helpers/app-fixture.ts';
import { get, post, register } from './helpers/session.ts';

interface OrderSummary {
	id: string;
	ownerUsername?: string;
	grandTotal: number;
}

/** Place an order for one YX1, as whoever the cookie identifies (or as a guest). */
async function placeOrder(harper: HarperContext, cookie?: string): Promise<OrderSummary> {
	const { response } = await post(
		harper,
		'/Order/',
		{ customer: VALID_CUSTOMER, paymentMethod: 'cash-on-delivery', items: [{ slug: 'yx1-earphones', quantity: 1 }] },
		cookie,
	);
	const body = await response.text();
	ok(response.ok, `checkout should succeed, got ${response.status}: ${body}`);
	return JSON.parse(body) as OrderSummary;
}

/** List orders visible to the caller. */
async function listOrders(harper: HarperContext, cookie?: string): Promise<OrderSummary[]> {
	const response = await get(harper, '/Order/?limit(100)&select(id,ownerUsername,grandTotal)', cookie);
	const body = await response.text();
	strictEqual(response.status, 200, `listing should succeed, got ${response.status}: ${body}`);
	return JSON.parse(body) as OrderSummary[];
}

suite('order scoping', (ctx: ContextWithHarper) => {
	let fixtureDir: string;
	let aliceCookie: string | undefined;
	let bobCookie: string | undefined;
	let aliceOrder: OrderSummary;
	let bobOrder: OrderSummary;
	let guestOrder: OrderSummary;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx, {
			config: { authentication: { authorizeLocal: false } },
		}));

		aliceCookie = await register(ctx.harper, 'alice.shopper@example.com');
		bobCookie = await register(ctx.harper, 'bob.shopper@example.com');

		aliceOrder = await placeOrder(ctx.harper, aliceCookie);
		bobOrder = await placeOrder(ctx.harper, bobCookie);
		guestOrder = await placeOrder(ctx.harper);
	});

	after(async () => {
		await teardownHarper(ctx);
		await rm(fixtureDir, { recursive: true, force: true });
	});

	test('the loopback super_user bypass is actually off', async () => {
		// Without this every assertion below would pass as super_user and prove nothing.
		strictEqual((await get(ctx.harper, '/Me')).status, 401);
	});

	test('lists only the caller their own orders', async () => {
		const alice = await listOrders(ctx.harper, aliceCookie);
		strictEqual(alice.length, 1);
		strictEqual(alice[0].id, aliceOrder.id);

		const bob = await listOrders(ctx.harper, bobCookie);
		strictEqual(bob.length, 1);
		strictEqual(bob[0].id, bobOrder.id);
	});

	test('a condition naming another customer returns nothing', async () => {
		// The filter is applied during execution, so it cannot be argued away by
		// crafting conditions the way an appended `ownerUsername` term could be.
		const response = await get(ctx.harper, '/Order/?ownerUsername=alice.shopper@example.com&select(id)', bobCookie);
		strictEqual(response.status, 200);
		strictEqual(((await response.json()) as unknown[]).length, 0);
	});

	test("hides another customer's order behind a 404 rather than a 403", async () => {
		// A 403 would confirm the id exists, turning the endpoint into a probing oracle.
		const response = await get(ctx.harper, `/Order/${aliceOrder.id}`, bobCookie);
		strictEqual(response.status, 404);
	});

	test('still serves the caller their own order by id', async () => {
		const response = await get(ctx.harper, `/Order/${bobOrder.id}`, bobCookie);
		strictEqual(response.status, 200);
		const order = (await response.json()) as OrderSummary;
		strictEqual(order.id, bobOrder.id);
		strictEqual(order.ownerUsername, 'bob.shopper@example.com');
	});

	test('never surfaces guest orders to a signed-in customer', async () => {
		// A guest order has no owner, so no username can match it. It is reachable
		// only by a super_user — which is the honest outcome of guest checkout.
		const alice = await listOrders(ctx.harper, aliceCookie);
		ok(!alice.some((order) => order.id === guestOrder.id));

		strictEqual((await get(ctx.harper, `/Order/${guestOrder.id}`, aliceCookie)).status, 404);
	});

	test('refuses anonymous order reads outright', async () => {
		const list = await get(ctx.harper, '/Order/?limit(10)');
		ok(list.status === 401 || list.status === 403, `expected a denial, got ${list.status}`);

		const byId = await get(ctx.harper, `/Order/${aliceOrder.id}`);
		ok(byId.status === 401 || byId.status === 403, `expected a denial, got ${byId.status}`);
	});

	test('lets a super_user see every order', async () => {
		// The scoping is a customer-facing rule, not a data-hiding one: support and
		// the CMS still need the whole table.
		const response = await fetch(restUrl(ctx.harper, '/Order/?limit(100)&select(id,ownerUsername)'), {
			headers: { Accept: 'application/json', Authorization: adminAuth(ctx.harper) },
		});
		strictEqual(response.status, 200);
		const orders = (await response.json()) as OrderSummary[];
		const ids = new Set(orders.map((order) => order.id));
		ok(ids.has(aliceOrder.id) && ids.has(bobOrder.id) && ids.has(guestOrder.id));
	});

	test('keeps a signed-out session from reading the orders it just placed', async () => {
		const cookie = await register(ctx.harper, 'carol.shopper@example.com');
		await placeOrder(ctx.harper, cookie);
		strictEqual((await listOrders(ctx.harper, cookie)).length, 1);

		await post(ctx.harper, '/SignOut', undefined, cookie);

		const afterSignOut = await get(ctx.harper, '/Order/?limit(10)', cookie);
		ok(
			afterSignOut.status === 401 || afterSignOut.status === 403,
			`a cleared session must not still read orders, got ${afterSignOut.status}`,
		);
	});
});
