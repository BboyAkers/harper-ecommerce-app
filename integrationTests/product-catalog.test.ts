/**
 * Integration tests for the product catalog: boots real Harper with the app's GraphQL
 * schema, Product resource, and data loader, then verifies the public REST catalog API
 * (seeded data, get-by-slug, category filtering, anonymous read access, and 404s).
 */
import { sendOperation, teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, suite, test } from 'node:test';
import { getJson, startAppHarper } from './helpers/app-fixture.ts';

const EXPECTED_SLUGS = [
	'xx59-headphones',
	'xx99-mark-one-headphones',
	'xx99-mark-two-headphones',
	'yx1-earphones',
	'zx7-speaker',
	'zx9-speaker',
];

suite('product catalog API', (ctx: ContextWithHarper) => {
	let fixtureDir: string;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx));
	});

	after(async () => {
		await teardownHarper(ctx);
		await rm(fixtureDir, { recursive: true, force: true });
	});

	test('boots with Product and Order tables in the named database', async () => {
		const description = (await sendOperation(ctx.harper, { operation: 'describe_all' })) as Record<
			string,
			Record<string, unknown>
		>;
		// The database name is asserted, not just the table names: the schemas declare
		// `@table(database: "harper_ecommerce_app")`, and dropping that argument would land these
		// tables in Harper's default `data` database without erroring. Spelled out rather than
		// imported from `resources/lib/tables.ts`, so a rename fails here instead of following along.
		ok(
			description.harper_ecommerce_app,
			`expected a harper_ecommerce_app database, got: ${Object.keys(description).join(', ')}`,
		);
		const tables = Object.keys(description.harper_ecommerce_app);
		for (const name of ['Product', 'Order', 'Cart']) {
			ok(tables.includes(name), `expected a ${name} table, got: ${tables.join(', ')}`);
		}
		// And nothing left behind in the default database. `dataLoader` would create an inferred
		// Product table there if `data/products.json` ever lost its `database` key.
		const defaultTables = Object.keys(description.data ?? {});
		for (const name of ['Product', 'Order', 'Cart']) {
			ok(!defaultTables.includes(name), `${name} should not exist in the default "data" database`);
		}
	});

	test('seeds all six products and serves them over REST', async () => {
		const response = await getJson(ctx.harper, '/Product/?limit(100)');
		strictEqual(response.status, 200);
		const products = (await response.json()) as { slug: string }[];
		strictEqual(products.length, 6);
		deepStrictEqual(products.map((p) => p.slug).sort(), EXPECTED_SLUGS);
	});

	test('returns a single product by slug with catalog fields intact', async () => {
		const response = await getJson(ctx.harper, '/Product/yx1-earphones');
		strictEqual(response.status, 200);
		const product = (await response.json()) as Record<string, unknown>;
		strictEqual(product.slug, 'yx1-earphones');
		strictEqual(product.name, 'YX1 Wireless Earphones');
		strictEqual(product.shortName, 'YX1');
		strictEqual(product.category, 'earphones');
		strictEqual(product.price, 599);
		strictEqual(product.new, true);
		ok(product.image && typeof product.image === 'object', 'image set should be present');
	});

	test('filters by the indexed category attribute', async () => {
		const response = await getJson(ctx.harper, '/Product/?category=headphones');
		strictEqual(response.status, 200);
		const products = (await response.json()) as { slug: string; category: string }[];
		strictEqual(products.length, 3);
		ok(products.every((p) => p.category === 'headphones'));
		deepStrictEqual(
			products.map((p) => p.slug).sort(),
			['xx59-headphones', 'xx99-mark-one-headphones', 'xx99-mark-two-headphones'],
		);
	});

	test('responds 404 for an unknown slug', async () => {
		const response = await getJson(ctx.harper, '/Product/does-not-exist');
		strictEqual(response.status, 404);
		await response.body?.cancel();
	});
});
