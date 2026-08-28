/**
 * Seeds the demo data that `dataLoader` cannot.
 *
 * `config.yaml`'s `dataLoader` already seeds the catalog from `data/products.json`
 * declaratively, and that is the right mechanism for it — records are upserted by
 * content hash on every boot. But three things a demo needs are not table records
 * you can declare:
 *
 *   - **Shoppers** live in Harper's built-in `users` table, created through the
 *     operations API rather than a schema table, so `dataLoader` cannot reach them.
 *   - **Orders** must be *placed*, not inserted. `Order.post` prices every line from
 *     the catalog, computes VAT and shipping, and draws stock down. An order written
 *     around that would carry totals nothing in the app agrees with.
 *   - **Carts** are keyed by the owner's email, so they cannot exist before their owner does.
 *
 * So this script drives the app's own HTTP endpoints, exactly as the storefront
 * does. That is the point as much as the convenience: seeding through `/SignUp`,
 * `/Order` and `/Cart/<email>` exercises the real validation, pricing and
 * inventory paths, and a seed run that succeeds is a smoke test of all three.
 *
 * Re-running is safe. Every step checks before it writes.
 *
 *   npm run seed                  # shoppers, orders, carts
 *   npm run seed -- --reset-stock # also restore catalog stock (needs admin)
 *   npm run seed -- --help
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import type { CartLine } from '../shared/cart.ts';
import { stockLabel } from '../shared/inventory.ts';
import type { OrderCustomer, PaymentMethod, Product } from '../shared/types.ts';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Harper's defaults: the app (and REST) on 9926, the operations API on 9925. */
const REST_URL = (process.env.HARPER_URL ?? 'http://localhost:9926').replace(/\/+$/, '');
const OPS_URL = (process.env.HARPER_OPS_URL ?? 'http://localhost:9925').replace(/\/+$/, '');

/**
 * Admin credentials, needed only by the steps that require super_user: creating
 * the editor account and restoring catalog stock. Everything else runs against
 * public endpoints, so the common path needs no configuration at all.
 */
const ADMIN_USERNAME = process.env.HARPER_ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.HARPER_ADMIN_PASSWORD;

/**
 * Shared by every seeded account. Harper stores a hash, so this is only ever a
 * demo convenience — it is printed at the end precisely so nobody is tempted to
 * treat these accounts as anything but disposable.
 */
const PASSWORD = process.env.SEED_PASSWORD ?? 'correct-horse-battery';

const EDITOR_EMAIL = 'editor@example.com';

/**
 * How long to wait for the catalog before giving up.
 *
 * Generous by default, because the common case is racing a just-started instance
 * and the alternative is a confusing failure. Overridable so the integration
 * suite can assert the give-up path without spending 30s on it.
 */
const CATALOG_WAIT_MS = Number(process.env.SEED_CATALOG_WAIT_MS ?? 30_000);

interface SeedOrder {
	items: CartLine[];
	paymentMethod: PaymentMethod;
	eMoneyNumber?: string;
}

interface SeedShopper {
	/**
	 * The account's email address, which `/SignUp` stores as the Harper username —
	 * so it is also the primary key of this shopper's cart. Kept equal to
	 * `customer.email` below: an order placed by this account should not claim a
	 * different address than the one it signs in with.
	 */
	email: string;
	customer: OrderCustomer;
	/** Placed in order, so the account page has a history rather than one row. */
	orders: SeedOrder[];
	/** Left in a saved server-side cart, to demo the cross-device cart. */
	cart?: CartLine[];
}

/**
 * Order lines deliberately name only the comfortably-stocked products.
 *
 * `Order.post` draws stock down for real, and `data/products.json` picks its stock
 * levels to put one product sold out and three into low-stock — the states the
 * badges exist to show. Ordering from those would quietly dismantle the demo the
 * catalog was arranged to give. yx1 (42) and xx99-mark-two (18) stay far clear of
 * the default threshold of 5 even after every order below.
 */
const SHOPPERS: SeedShopper[] = [
	{
		email: 'ada@example.com',
		customer: {
			name: 'Ada Lovelace',
			email: 'ada@example.com',
			phone: '+44 20 7946 0958',
			address: '1 Analytical Way',
			zip: 'N1 9GU',
			city: 'London',
			country: 'United Kingdom',
		},
		orders: [
			{ items: [{ slug: 'xx99-mark-two-headphones', quantity: 1 }], paymentMethod: 'cash-on-delivery' },
			{
				items: [
					{ slug: 'yx1-earphones', quantity: 2 },
					{ slug: 'xx99-mark-two-headphones', quantity: 1 },
				],
				paymentMethod: 'e-money',
				eMoneyNumber: '238521993',
			},
		],
	},
	{
		email: 'grace@example.com',
		customer: {
			name: 'Grace Hopper',
			email: 'grace@example.com',
			phone: '+1 212 555 0134',
			address: '55 Compiler Court',
			zip: '10001',
			city: 'New York',
			country: 'United States',
		},
		orders: [{ items: [{ slug: 'yx1-earphones', quantity: 1 }], paymentMethod: 'e-money', eMoneyNumber: '419502234' }],
		// Includes xx59 (stock 3, so low) on purpose: the cart's quantity control
		// caps at available stock, which is only visible with a low-stock line in it.
		cart: [
			{ slug: 'xx59-headphones', quantity: 2 },
			{ slug: 'zx7-speaker', quantity: 1 },
		],
	},
];

const say = (message: string) => console.log(message);
const step = (message: string) => console.log(`\n${message}`);
const done = (message: string) => console.log(`  ✓ ${message}`);
const skip = (message: string) => console.log(`  – ${message}`);
const warn = (message: string) => console.log(`  ! ${message}`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

class SeedError extends Error {}

/** Pull the `name=value` pair out of a Set-Cookie header; Harper's session is HttpOnly. */
function sessionCookie(response: Response): string | undefined {
	return response.headers.get('set-cookie')?.split(';')[0];
}

function adminAuthHeader(): string {
	return `Basic ${Buffer.from(`${ADMIN_USERNAME}:${ADMIN_PASSWORD}`).toString('base64')}`;
}

/** Best-effort error text: Harper sends JSON `{message}`, but not for every failure mode. */
async function describeFailure(response: Response): Promise<string> {
	const body = await response.text().catch(() => '');
	try {
		const parsed = JSON.parse(body) as { message?: string; error?: string };
		return `HTTP ${response.status}: ${parsed.message ?? parsed.error ?? body}`;
	} catch {
		return `HTTP ${response.status}${body ? `: ${body.slice(0, 200)}` : ''}`;
	}
}

/**
 * One request against the app's REST surface.
 *
 * `body` and `cookie` are named rather than positional deliberately: both are
 * optional, both are frequently one-of-two, and passing a session cookie into the
 * body slot is a mistake that fetch reports as "Request with GET/HEAD method
 * cannot have body" — nowhere near the actual error.
 */
interface RequestOptions {
	body?: unknown;
	cookie?: string;
	/** Basic-auth as the admin user, for the operations the app itself never performs. */
	asAdmin?: boolean;
}

async function request(
	method: string,
	path: string,
	{ body, cookie, asAdmin }: RequestOptions = {},
): Promise<Response> {
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (cookie) headers.Cookie = cookie;
	if (asAdmin) headers.Authorization = adminAuthHeader();
	return fetch(`${REST_URL}${path}`, {
		method,
		headers,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

/** Call the operations API as the admin user. */
async function operation<T>(payload: Record<string, unknown>): Promise<T> {
	const response = await fetch(OPS_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: adminAuthHeader() },
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		throw new SeedError(`operation ${String(payload.operation)} failed — ${await describeFailure(response)}`);
	}
	return (await response.json()) as T;
}

/** The catalog as `data/products.json` declares it — the file is the source of truth. */
async function declaredProducts(): Promise<Product[]> {
	const raw = await readFile(join(projectRoot, 'data', 'products.json'), 'utf8');
	return (JSON.parse(raw) as { records: Product[] }).records;
}

/**
 * Wait for `dataLoader` to have finished seeding the catalog.
 *
 * Everything downstream prices against the Product table, so starting before it
 * is populated produces a confusing cascade of 400s about unknown slugs. Polling
 * rather than failing immediately makes `npm run dev & npm run seed` work.
 */
async function waitForCatalog(expected: number): Promise<Product[]> {
	const deadline = Date.now() + CATALOG_WAIT_MS;
	let reason = 'no response yet';
	while (Date.now() < deadline) {
		try {
			const response = await request('GET', '/Product/?limit(100)');
			if (response.ok) {
				const products = (await response.json()) as Product[];
				if (products.length >= expected) return products;
				reason = `found ${products.length} of ${expected} products`;
			} else {
				reason = await describeFailure(response);
			}
		} catch (error) {
			reason = (error as Error).message;
		}
		await sleep(1000);
	}
	throw new SeedError(
		`Gave up waiting for the catalog at ${REST_URL} (${reason}).\n` +
			`  Is Harper running? Start it with \`npm run dev\`, or point this at another\n` +
			`  instance with HARPER_URL=https://your-cluster.example`,
	);
}

/** Create the shopper if absent, then sign in. Returns the session cookie. */
async function ensureShopper(email: string): Promise<string> {
	const created = await request('POST', '/SignUp', { body: { email, password: PASSWORD } });
	if (created.ok) {
		const cookie = sessionCookie(created);
		if (!cookie) throw new SeedError(`signed ${email} up but got no session cookie back`);
		done(`created ${email}`);
		return cookie;
	}
	// 409 is the documented "an account already exists", i.e. a previous seed run.
	if (created.status !== 409) {
		throw new SeedError(`could not create ${email} — ${await describeFailure(created)}`);
	}

	const signedIn = await request('POST', '/SignIn', { body: { email, password: PASSWORD } });
	if (!signedIn.ok) {
		throw new SeedError(
			`${email} already exists but the seed password does not work — ${await describeFailure(signedIn)}.\n` +
				`  Set SEED_PASSWORD to the password it was created with, or drop the user.`,
		);
	}
	const cookie = sessionCookie(signedIn);
	if (!cookie) throw new SeedError(`signed ${email} in but got no session cookie back`);
	skip(`${email} already exists`);
	return cookie;
}

/**
 * Place this shopper's orders, unless they already have some.
 *
 * The guard is "has any order at all" rather than a per-order match, because
 * `Order.post` mints a fresh uuid every call — there is no natural key to compare
 * against, so re-running would otherwise stack up duplicate history and drain
 * stock a little further each time.
 */
async function seedOrders(shopper: SeedShopper, cookie: string): Promise<void> {
	const existing = await request('GET', '/Order/', { cookie });
	if (!existing.ok)
		throw new SeedError(`could not read ${shopper.email}'s orders — ${await describeFailure(existing)}`);
	const orders = (await existing.json()) as unknown[];
	if (orders.length > 0) {
		skip(`${shopper.email} already has ${orders.length} order(s)`);
		return;
	}

	for (const order of shopper.orders) {
		const response = await request('POST', '/Order', {
			body: {
				customer: shopper.customer,
				paymentMethod: order.paymentMethod,
				eMoneyNumber: order.eMoneyNumber,
				items: order.items,
			},
			cookie,
		});
		if (!response.ok) {
			throw new SeedError(`could not place an order for ${shopper.email} — ${await describeFailure(response)}`);
		}
		const placed = (await response.json()) as { grandTotal?: number };
		const lines = order.items.map((item) => `${item.quantity}x ${item.slug}`).join(', ');
		done(`placed ${lines} (total $${placed.grandTotal ?? '?'})`);
	}
}

/** Store a saved cart. `PUT /Cart/<email>` replaces the whole cart, so this is naturally idempotent. */
async function seedCart(shopper: SeedShopper, cookie: string): Promise<void> {
	if (!shopper.cart) return;
	const response = await request('PUT', `/Cart/${encodeURIComponent(shopper.email)}`, {
		body: { items: shopper.cart },
		cookie,
	});
	if (!response.ok) {
		throw new SeedError(`could not save ${shopper.email}'s cart — ${await describeFailure(response)}`);
	}
	done(`saved a ${shopper.cart.length}-line cart for ${shopper.email}`);
}

/**
 * Create the editor account.
 *
 * Needs super_user: `/SignUp` hard-codes the customer role on purpose, so that a
 * self-serve endpoint can never mint a privileged account. Granting `editor` is
 * therefore an administrative act and belongs on the operations API.
 */
async function ensureEditor(): Promise<void> {
	const users = await operation<{ username: string }[]>({ operation: 'list_users' });
	if (users.some((user) => user.username === EDITOR_EMAIL)) {
		skip(`${EDITOR_EMAIL} already exists`);
		return;
	}
	await operation({
		operation: 'add_user',
		username: EDITOR_EMAIL,
		password: PASSWORD,
		role: 'editor',
		active: true,
	});
	done(`created ${EDITOR_EMAIL} with the editor role`);
}

/**
 * Re-assert the stock levels `data/products.json` declares.
 *
 * Worth its own step because restarting Harper does *not* do this: `dataLoader`
 * skips records whose content hash still matches the file, and placing orders
 * changes the table without changing the file. So once a demo has drained
 * inventory, only an explicit write puts it back.
 */
async function restoreStock(declared: Product[]): Promise<void> {
	for (const product of declared) {
		const patch: Record<string, unknown> = { stock: product.stock };
		if (product.lowStockThreshold !== undefined) patch.lowStockThreshold = product.lowStockThreshold;
		const response = await request('PATCH', `/Product/${product.id}`, { body: patch, asAdmin: true });
		if (!response.ok) {
			throw new SeedError(`could not restore stock for ${product.slug} — ${await describeFailure(response)}`);
		}
	}
	done(`restored declared stock on ${declared.length} products`);
}

/** Print what a shopper will actually see, using the same vocabulary the badges use. */
function reportCatalog(products: Product[]): void {
	const ordered = [...products].sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0));
	for (const product of ordered) {
		const label = stockLabel(product);
		say(`  ${product.slug.padEnd(26)} stock ${String(product.stock ?? '—').padStart(3)}${label ? `  ${label}` : ''}`);
	}
}

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			'reset-stock': { type: 'boolean', default: false },
			help: { type: 'boolean', short: 'h', default: false },
		},
	});

	if (values.help) {
		say(
			[
				'Seed the demo data for this app.',
				'',
				'  npm run seed                    Shoppers, order history and saved carts.',
				'  npm run seed -- --reset-stock   Also restore the stock levels data/products.json declares.',
				'',
				'Environment:',
				'  HARPER_URL              App/REST base URL       (default http://localhost:9926)',
				'  HARPER_OPS_URL          Operations API base URL (default http://localhost:9925)',
				'  HARPER_ADMIN_USERNAME   Admin user, for the editor account and --reset-stock',
				'  HARPER_ADMIN_PASSWORD   Admin password',
				'  SEED_PASSWORD           Password for the seeded accounts',
				'  SEED_CATALOG_WAIT_MS    How long to wait for the catalog (default 30000)',
				'',
				'Safe to re-run: every step checks before it writes.',
			].join('\n'),
		);
		return;
	}

	const hasAdmin = Boolean(ADMIN_USERNAME && ADMIN_PASSWORD);
	const declared = await declaredProducts();

	step(`Catalog — waiting for dataLoader to seed ${declared.length} products`);
	await waitForCatalog(declared.length);
	done(`catalog is live at ${REST_URL}`);

	if (values['reset-stock']) {
		step('Stock — restoring declared levels');
		if (hasAdmin) await restoreStock(declared);
		else warn('skipped: needs HARPER_ADMIN_USERNAME and HARPER_ADMIN_PASSWORD');
	}

	for (const shopper of SHOPPERS) {
		step(`Shopper — ${shopper.email}`);
		const cookie = await ensureShopper(shopper.email);
		await seedOrders(shopper, cookie);
		await seedCart(shopper, cookie);
	}

	step('Editor — catalog authoring account');
	if (hasAdmin) await ensureEditor();
	else warn(`skipped: needs HARPER_ADMIN_USERNAME and HARPER_ADMIN_PASSWORD to grant the editor role`);

	step('Catalog as shoppers will see it');
	reportCatalog(await waitForCatalog(declared.length));

	step('Done. Sign in at the storefront with:');
	for (const shopper of SHOPPERS) say(`  ${shopper.email.padEnd(20)} / ${PASSWORD}`);
	if (hasAdmin) say(`  ${EDITOR_EMAIL.padEnd(20)} / ${PASSWORD}`);
	say('');
}

main().catch((error: unknown) => {
	console.error(`\nSeed failed: ${error instanceof SeedError ? error.message : String(error)}`);
	process.exitCode = 1;
});
