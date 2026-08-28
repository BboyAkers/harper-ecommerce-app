/**
 * Runs `scripts/seed.ts` against a fresh instance, as a subprocess, exactly as a
 * developer would.
 *
 * A seed script that nobody runs in CI rots silently: it talks to five endpoints
 * whose contracts live in this repo, and the first anyone would learn of a break
 * is a broken demo. So this asserts the script's real output rather than
 * re-implementing what it does.
 *
 * `authorizeLocal: false` matters more here than in most suites. With the loopback
 * bypass on, every request the script makes would be super_user and the whole
 * sign-up/sign-in/session path — the part most likely to break — would never be
 * exercised at all.
 */
import { teardownHarper, type ContextWithHarper } from '@harperfast/integration-testing';
import { ok, strictEqual } from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { after, before, suite, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { restUrl, startAppHarper } from './helpers/app-fixture.ts';
import { cartPath, get } from './helpers/session.ts';

const execFileAsync = promisify(execFile);
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The accounts `scripts/seed.ts` creates — email addresses, since that is what an account is. */
const GRACE = 'grace@example.com';
const SEEDED_ACCOUNTS = ['ada@example.com', GRACE, 'editor@example.com'];

interface SeedRun {
	stdout: string;
	stderr: string;
}

suite('seed script', (ctx: ContextWithHarper) => {
	let fixtureDir: string;
	let first: SeedRun;
	let second: SeedRun;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx, {
			config: { authentication: { authorizeLocal: false } },
		}));

		// The script reads data/products.json from the project root and talks to the
		// fixture instance over HTTP, so it needs nothing but the URLs and credentials.
		const env = {
			...process.env,
			HARPER_URL: ctx.harper.httpURL,
			HARPER_OPS_URL: ctx.harper.operationsAPIURL,
			HARPER_ADMIN_USERNAME: ctx.harper.admin.username,
			HARPER_ADMIN_PASSWORD: ctx.harper.admin.password,
		};
		const run = () => execFileAsync(process.execPath, [join(projectRoot, 'scripts', 'seed.ts')], { env });

		first = await run();
		// Run twice: the idempotency claim in the script's own docstring is the thing
		// most likely to be quietly wrong, and the second run is where it shows.
		second = await run();
	});

	after(async () => {
		await teardownHarper(ctx);
		await rm(fixtureDir, { recursive: true, force: true });
	});

	test('the loopback super_user bypass is actually off', async () => {
		// Without this the script would seed as super_user and prove nothing about auth.
		strictEqual((await get(ctx.harper, '/Me')).status, 401);
	});

	test('creates the shoppers and the editor on a first run', () => {
		for (const account of SEEDED_ACCOUNTS) {
			ok(first.stdout.includes(`created ${account}`), `expected to create ${account}:\n${first.stdout}`);
		}
	});

	test('places the order history it advertises', () => {
		// Three orders across two shoppers, priced server-side.
		strictEqual((first.stdout.match(/✓ placed /g) ?? []).length, 3, first.stdout);
	});

	test('gives a shopper a saved server-side cart', async () => {
		const response = await get(ctx.harper, cartPath(GRACE), undefined);
		// Anonymous reads are refused, which is the cart's whole authorization story —
		// so assert through the owner's own session instead.
		strictEqual(response.status, 401);

		const signIn = await fetch(restUrl(ctx.harper, '/SignIn'), {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: GRACE, password: 'correct-horse-battery' }),
		});
		ok(signIn.ok, `seeded shopper should be able to sign in, got ${signIn.status}`);
		const cookie = signIn.headers.get('set-cookie')?.split(';')[0];

		const cart = (await (await get(ctx.harper, cartPath(GRACE), cookie)).json()) as {
			items: { slug: string; quantity: number }[];
		};
		strictEqual(cart.items.length, 2, JSON.stringify(cart));
	});

	test('leaves the catalog stock states the demo depends on intact', async () => {
		const products = (await (await get(ctx.harper, '/Product/?limit(100)')).json()) as {
			slug: string;
			stock: number;
		}[];
		const bySlug = new Map(products.map((product) => [product.slug, product.stock]));
		// Orders draw stock down for real, so the seeded lines deliberately avoid the
		// products whose levels put a badge on screen. If someone adds an order for one
		// of these, this is where they find out.
		strictEqual(bySlug.get('xx99-mark-one-headphones'), 0, 'the sold-out product must stay sold out');
		strictEqual(bySlug.get('xx59-headphones'), 3, 'the low-stock product must stay low');
		strictEqual(bySlug.get('zx7-speaker'), 7, 'the low-stock speaker must stay low');
	});

	test('is idempotent: a second run creates nothing and places no orders', () => {
		ok(!second.stdout.includes('✓ created'), `second run should create nothing:\n${second.stdout}`);
		ok(!second.stdout.includes('✓ placed'), `second run should place no orders:\n${second.stdout}`);
		for (const account of SEEDED_ACCOUNTS) {
			ok(second.stdout.includes(`${account} already exists`), `expected ${account} to be skipped`);
		}
		ok(second.stdout.includes('already has 2 order(s)'), 'ada should be reported as already having history');
	});

	test('restores declared stock on request', async () => {
		const drained = await fetch(restUrl(ctx.harper, '/Product/xx59-headphones'), {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Basic ${Buffer.from(`${ctx.harper.admin.username}:${ctx.harper.admin.password}`).toString('base64')}`,
			},
			body: JSON.stringify({ stock: 1 }),
		});
		ok(drained.ok, `stock drain should succeed, got ${drained.status}`);

		await execFileAsync(process.execPath, [join(projectRoot, 'scripts', 'seed.ts'), '--reset-stock'], {
			env: {
				...process.env,
				HARPER_URL: ctx.harper.httpURL,
				HARPER_OPS_URL: ctx.harper.operationsAPIURL,
				HARPER_ADMIN_USERNAME: ctx.harper.admin.username,
				HARPER_ADMIN_PASSWORD: ctx.harper.admin.password,
			},
		});

		const product = (await (await get(ctx.harper, '/Product/xx59-headphones')).json()) as { stock: number };
		// Restarting Harper would NOT do this — dataLoader skips records whose content
		// hash still matches the file — which is the reason the flag exists.
		strictEqual(product.stock, 3);
	});

	test('fails with a usable message when no instance is reachable', async () => {
		const failure = await execFileAsync(process.execPath, [join(projectRoot, 'scripts', 'seed.ts')], {
			// Short wait: the script's default is 30s, and this asserts the give-up
			// path, not the patience.
			env: { ...process.env, HARPER_URL: 'http://127.0.0.1:1', SEED_CATALOG_WAIT_MS: '2000' },
		}).catch((error: { code?: number; stdout?: string; stderr?: string }) => error);

		const combined = `${(failure as { stdout?: string }).stdout ?? ''}${(failure as { stderr?: string }).stderr ?? ''}`;
		ok(combined.includes('Is Harper running?'), `expected an actionable error, got:\n${combined}`);
	});
});
