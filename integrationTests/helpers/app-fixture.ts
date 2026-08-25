/**
 * Shared helpers for the Audiophile integration tests.
 *
 * `buildAppFixture()` assembles a backend-only Harper component (config + schemas +
 * resources + seed data) in a temp directory. `setupHarperWithFixture()` copies it into a
 * throwaway Harper install so the real Product/Order resources, GraphQL schema, and data
 * loader are exercised against actual Harper — without the frontend build (`@harperfast/vite`)
 * or type codegen, which need npm deps and aren't part of the API surface under test.
 */
import {
	type HarperContext,
	type StartHarperOptions,
	setupHarperWithFixture,
	type StartedHarperTestContext,
	type HarperTestContext,
} from '@harperfast/integration-testing';
import { cp, mkdtemp, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Backend-only component config: no @harperfast/vite / @harperfast/schema-codegen (those need
// the app's node_modules and only matter to the frontend), just the REST API + data.
const FIXTURE_CONFIG = `rest: true
graphqlSchema:
  files: 'schemas/*.graphql'
jsResource:
  files: 'resources/*.ts'
dataLoader:
  files: 'data/*.json'
`;

/**
 * Resolve the Harper CLI entry (`dist/bin/harper.js`) from the locally-installed `harper` dep.
 * We can't use `require.resolve('harper/dist/bin/harper.js')` — harper's `exports` map only
 * exposes `.` — so resolve the `.` entry and walk up to the package root's `bin.harper`.
 */
export function resolveHarperBinPath(): string {
	const require = createRequire(import.meta.url);
	let dir = dirname(require.resolve('harper'));
	while (dir !== dirname(dir)) {
		const pkgPath = join(dir, 'package.json');
		if (existsSync(pkgPath)) {
			const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
			if (pkg.name === 'harper' && pkg.bin?.harper) return join(dir, pkg.bin.harper);
		}
		dir = dirname(dir);
	}
	throw new Error('Could not resolve the harper CLI bin path from the "harper" dependency');
}

/** Build the backend-only component directory in a temp dir. Returns its absolute path. */
export async function buildAppFixture(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), 'audiophile-fixture-'));
	await writeFile(join(dir, 'config.yaml'), FIXTURE_CONFIG);
	// The config globs (schemas/*.graphql, resources/*.ts, data/*.json) select what actually
	// loads, so copying the directories wholesale is fine — the real source is the single truth.
	for (const sub of ['schemas', 'resources', 'data']) {
		await cp(join(projectRoot, sub), join(dir, sub), { recursive: true });
	}
	return dir;
}

/** Build the fixture and start a Harper instance with it pre-installed. */
export async function startAppHarper(
	ctx: HarperTestContext,
	options?: StartHarperOptions,
): Promise<{ started: StartedHarperTestContext; fixtureDir: string }> {
	const fixtureDir = await buildAppFixture();
	const started = await setupHarperWithFixture(ctx, fixtureDir, {
		harperBinPath: resolveHarperBinPath(),
		...options,
	});
	// NOTE: the harness starts Harper with `--AUTHENTICATION_AUTHORIZELOCAL=true`, so every
	// request from this (loopback) test process is authorized as super_user. That means the
	// resource-level access rules (Product.allowRead / Order.allowCreate) can't be distinguished
	// from super_user access here — these suites exercise data, schema, and resource business
	// logic; the public-vs-authenticated boundary is enforced by Harper's auth layer in a real
	// (remote) deployment.
	return { started, fixtureDir };
}

/** Absolute URL for a REST path against the running instance. */
export function restUrl(harper: HarperContext, path: string): string {
	return new URL(path, harper.httpURL).href;
}

/** HTTP Basic auth header for the instance's admin user (for endpoints that require auth). */
export function adminAuth(harper: HarperContext): string {
	const { username, password } = harper.admin;
	return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

/** GET a REST path as JSON. Pass `auth: true` to send admin Basic credentials. */
export function getJson(harper: HarperContext, path: string, opts: { auth?: boolean } = {}) {
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (opts.auth) headers.Authorization = adminAuth(harper);
	return fetch(restUrl(harper, path), { headers });
}

/** POST a JSON body to a REST path (anonymous by default). */
export function postJson(harper: HarperContext, path: string, body: unknown, opts: { auth?: boolean } = {}) {
	const headers: Record<string, string> = { 'Content-Type': 'application/json', Accept: 'application/json' };
	if (opts.auth) headers.Authorization = adminAuth(harper);
	return fetch(restUrl(harper, path), { method: 'POST', headers, body: JSON.stringify(body) });
}

/** A valid customer block for order-creation tests. */
export const VALID_CUSTOMER = {
	name: 'Ada Lovelace',
	email: 'ada@example.com',
	phone: '+1 202-555-0136',
	address: '1 Analytical Way',
	zip: '10001',
	city: 'London',
	country: 'United Kingdom',
};
