/**
 * Integration tests for the Order resource: boots real Harper with the app and verifies
 * order creation computes totals server-side from catalog prices, enforces validation, and
 * persists orders. (Note: the test harness authorizes loopback requests as super_user, so the
 * public-create / auth-to-read access boundary is not asserted here — see helpers/app-fixture.ts.)
 */
import { teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { ok, strictEqual } from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, suite, test } from 'node:test';
import { getJson, postJson, startAppHarper, VALID_CUSTOMER } from './helpers/app-fixture.ts';

interface OrderResult {
	id: string;
	createdAt: string;
	paymentMethod: string;
	items: { slug: string; name: string; price: number; quantity: number; image: string }[];
	total: number;
	shipping: number;
	vat: number;
	grandTotal: number;
}

function placeOrder(harper: ContextWithHarper['harper'], overrides: Record<string, unknown> = {}) {
	return postJson(harper, '/Order/', {
		customer: VALID_CUSTOMER,
		paymentMethod: 'cash-on-delivery',
		items: [{ slug: 'yx1-earphones', quantity: 1 }],
		...overrides,
	});
}

suite('orders API', (ctx: ContextWithHarper) => {
	let fixtureDir: string;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx));
	});

	after(async () => {
		await teardownHarper(ctx);
		await rm(fixtureDir, { recursive: true, force: true });
	});

	test('places an order and computes totals server-side from catalog prices', async () => {
		const response = await placeOrder(ctx.harper, {
			items: [
				{ slug: 'yx1-earphones', quantity: 2 }, // 2 x 599 = 1198
				{ slug: 'zx9-speaker', quantity: 1 }, // 1 x 4500 = 4500
			],
		});
		ok(response.ok, `expected a 2xx, got ${response.status}`);
		const order = (await response.json()) as OrderResult;

		strictEqual(order.total, 5698);
		strictEqual(order.shipping, 50);
		strictEqual(order.vat, 1140); // round(5698 * 0.2)
		strictEqual(order.grandTotal, 5748); // total + shipping (VAT is included)

		// Line items are priced and named from the catalog, not the request.
		const yx1 = order.items.find((item) => item.slug === 'yx1-earphones');
		strictEqual(yx1?.price, 599);
		strictEqual(yx1?.name, 'YX1');
		strictEqual(yx1?.quantity, 2);
		ok(order.id, 'order should get an id');
		ok(order.createdAt, 'order should get a createdAt');
	});

	test('ignores any client-supplied price and uses the catalog price', async () => {
		const response = await placeOrder(ctx.harper, {
			items: [{ slug: 'yx1-earphones', quantity: 1, price: 1, name: 'Free stuff' }],
		});
		ok(response.ok);
		const order = (await response.json()) as OrderResult;
		strictEqual(order.total, 599);
		strictEqual(order.items[0].price, 599);
		strictEqual(order.items[0].name, 'YX1');
	});

	test('rejects an unknown product slug', async () => {
		const response = await placeOrder(ctx.harper, { items: [{ slug: 'not-a-product', quantity: 1 }] });
		strictEqual(response.status, 400);
		await response.body?.cancel();
	});

	test('rejects an empty cart', async () => {
		const response = await placeOrder(ctx.harper, { items: [] });
		strictEqual(response.status, 400);
		await response.body?.cancel();
	});

	test('rejects an invalid quantity', async () => {
		const response = await placeOrder(ctx.harper, { items: [{ slug: 'yx1-earphones', quantity: 0 }] });
		strictEqual(response.status, 400);
		await response.body?.cancel();
	});

	test('rejects a malformed email', async () => {
		const response = await placeOrder(ctx.harper, { customer: { ...VALID_CUSTOMER, email: 'nope' } });
		strictEqual(response.status, 400);
		await response.body?.cancel();
	});

	test('rejects a missing customer field', async () => {
		const { name: _omitted, ...withoutName } = VALID_CUSTOMER;
		const response = await placeOrder(ctx.harper, { customer: withoutName });
		strictEqual(response.status, 400);
		await response.body?.cancel();
	});

	test('requires an e-Money number when paying by e-Money', async () => {
		const response = await placeOrder(ctx.harper, { paymentMethod: 'e-money' });
		strictEqual(response.status, 400);
		await response.body?.cancel();
	});

	test('accepts an e-Money order when the number is provided', async () => {
		const response = await placeOrder(ctx.harper, { paymentMethod: 'e-money', eMoneyNumber: '238521993' });
		ok(response.ok, `expected a 2xx, got ${response.status}`);
		const order = (await response.json()) as OrderResult;
		strictEqual(order.paymentMethod, 'e-money');
	});

	test('persists created orders so they can be read back', async () => {
		// (Access control — that reading orders requires auth while creating does not — is enforced
		// by Harper's auth layer in a real deployment; it can't be asserted here because the test
		// harness authorizes all loopback requests as super_user. See helpers/app-fixture.ts.)
		await placeOrder(ctx.harper); // ensure at least one order exists
		const response = await getJson(ctx.harper, '/Order/?limit(100)', { auth: true });
		strictEqual(response.status, 200);
		const orders = (await response.json()) as OrderResult[];
		ok(Array.isArray(orders) && orders.length >= 1, 'stored orders should be retrievable');
	});
});
