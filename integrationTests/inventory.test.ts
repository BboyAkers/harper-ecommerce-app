/**
 * Integration tests for inventory enforcement and catalog lookup.
 *
 * The most important case here is `id !== slug`. Order pricing used to call
 * `tables.Product.get(item.slug)` — a primary-key lookup that only worked
 * because every seeded record happens to set `id === slug`. A product created
 * through the CMS gets a generated id, and every order for it would have failed.
 * These tests pin the indexed-slug lookup so that cannot regress.
 */
import { teardownHarper, type ContextWithHarper, type HarperContext } from '@harperfast/integration-testing';
import { ok, strictEqual } from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, suite, test } from 'node:test';
import { getJson, postJson, startAppHarper, VALID_CUSTOMER } from './helpers/app-fixture.ts';

interface OrderResult {
	id: string;
	ownerUsername?: string;
	items: { slug: string; name: string; price: number; quantity: number }[];
	total: number;
}

/** Create a catalog product. `id` is deliberately independent of `slug`. */
async function createProduct(
	harper: HarperContext,
	product: { id: string; slug: string; shortName: string; price: number; stock?: number },
) {
	const response = await postJson(
		harper,
		'/Product/',
		{
			ord: 99,
			name: `${product.shortName} Test Unit`,
			category: 'headphones',
			new: false,
			description: 'Fixture product.',
			features: 'Fixture features.',
			...product,
		},
		{ auth: true },
	);
	ok(response.ok, `product create should succeed, got ${response.status}`);
	return product;
}

function placeOrder(harper: HarperContext, items: { slug: string; quantity: number }[]) {
	return postJson(harper, '/Order/', {
		customer: VALID_CUSTOMER,
		paymentMethod: 'cash-on-delivery',
		items,
	});
}

async function stockOf(harper: HarperContext, id: string): Promise<number | undefined> {
	const response = await getJson(harper, `/Product/${id}`, { auth: true });
	ok(response.ok, `expected to read back product ${id}`);
	return ((await response.json()) as { stock?: number }).stock;
}

suite('inventory and catalog lookup', (ctx: ContextWithHarper) => {
	let fixtureDir: string;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx));
	});

	after(async () => {
		await teardownHarper(ctx);
		await rm(fixtureDir, { recursive: true, force: true });
	});

	test('prices an order for a product whose id does not match its slug', async () => {
		await createProduct(ctx.harper, {
			id: '7f3c1a90-0000-4000-8000-000000000001',
			slug: 'cms-created-headphones',
			shortName: 'CMS1',
			price: 250,
			stock: 5,
		});

		const response = await placeOrder(ctx.harper, [{ slug: 'cms-created-headphones', quantity: 2 }]);
		// Read the body once: a template literal in the assertion message is evaluated
		// eagerly, so `await response.text()` there would consume it before `.json()`.
		const body = await response.text();
		ok(response.ok, `expected a 2xx, got ${response.status}: ${body}`);
		const order = JSON.parse(body) as OrderResult;

		strictEqual(order.total, 500);
		strictEqual(order.items[0].slug, 'cms-created-headphones');
		strictEqual(order.items[0].name, 'CMS1');
		strictEqual(order.items[0].price, 250);
	});

	test('rejects an order for a sold-out product', async () => {
		await createProduct(ctx.harper, {
			id: '7f3c1a90-0000-4000-8000-000000000002',
			slug: 'sold-out-headphones',
			shortName: 'SOLD',
			price: 100,
			stock: 0,
		});

		const response = await placeOrder(ctx.harper, [{ slug: 'sold-out-headphones', quantity: 1 }]);
		strictEqual(response.status, 409);
		ok((await response.text()).includes('sold out'));
	});

	test('rejects an order exceeding available stock and reports what is left', async () => {
		await createProduct(ctx.harper, {
			id: '7f3c1a90-0000-4000-8000-000000000003',
			slug: 'scarce-headphones',
			shortName: 'SCARCE',
			price: 100,
			stock: 3,
		});

		const response = await placeOrder(ctx.harper, [{ slug: 'scarce-headphones', quantity: 4 }]);
		strictEqual(response.status, 409);
		ok((await response.text()).includes('Only 3'));

		// The rejected order must not have drawn anything down.
		strictEqual(await stockOf(ctx.harper, '7f3c1a90-0000-4000-8000-000000000003'), 3);
	});

	test('accepts an order for exactly the available stock and draws it down to zero', async () => {
		const id = '7f3c1a90-0000-4000-8000-000000000004';
		await createProduct(ctx.harper, { id, slug: 'last-units-headphones', shortName: 'LAST', price: 100, stock: 2 });

		const response = await placeOrder(ctx.harper, [{ slug: 'last-units-headphones', quantity: 2 }]);
		ok(response.ok, `expected a 2xx, got ${response.status}`);
		strictEqual(await stockOf(ctx.harper, id), 0);

		// Now genuinely sold out.
		const second = await placeOrder(ctx.harper, [{ slug: 'last-units-headphones', quantity: 1 }]);
		strictEqual(second.status, 409);
	});

	test('leaves a product with no stock field orderable and untracked', async () => {
		const id = '7f3c1a90-0000-4000-8000-000000000005';
		await createProduct(ctx.harper, { id, slug: 'untracked-headphones', shortName: 'UNTRACKED', price: 100 });

		const response = await placeOrder(ctx.harper, [{ slug: 'untracked-headphones', quantity: 50 }]);
		ok(response.ok, `an untracked product should not be stock-limited, got ${response.status}`);
		strictEqual(await stockOf(ctx.harper, id), undefined);
	});

	test('stamps ownerUsername from the authenticated session', async () => {
		// The harness authorizes loopback as super_user, so this request carries the
		// admin identity — enough to pin that the field is populated from the session
		// rather than from the request body.
		const response = await placeOrder(ctx.harper, [{ slug: 'yx1-earphones', quantity: 1 }]);
		ok(response.ok, `expected a 2xx, got ${response.status}`);
		const order = (await response.json()) as OrderResult;
		ok(order.ownerUsername, 'an authenticated order should record its owner');
	});

	test('seeds inventory levels from data/products.json', async () => {
		strictEqual(await stockOf(ctx.harper, 'xx99-mark-one-headphones'), 0, 'one product seeds as sold out');
		strictEqual(await stockOf(ctx.harper, 'xx59-headphones'), 3, 'one product seeds below the default threshold');

		const zx9 = await getJson(ctx.harper, '/Product/zx9-speaker', { auth: true });
		const record = (await zx9.json()) as { stock?: number; lowStockThreshold?: number };
		strictEqual(record.lowStockThreshold, 10, 'per-product threshold override is seeded');
	});
});
