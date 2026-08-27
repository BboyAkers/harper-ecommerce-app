/**
 * Integration tests for live (WebSocket) subscription scoping.
 *
 * These exist because subscription authorization does NOT come along for free
 * with the REST scoping in `resources/Order.ts` and `resources/Cart.ts`.
 * `Resource.connect()` calls `subscribe()` directly — it never routes through
 * `search()` or `get()` — and the only authorization on that path is
 * `allowRead`. `Cart.allowRead()` returns true unconditionally and `Order`
 * inherits the role's table-level grant, so before the `subscribe()` overrides
 * these suites cover, `ws://…/Cart/<any-username>` streamed another customer's
 * cart to an anonymous client.
 *
 * Runs with `authorizeLocal: false`; otherwise every request from this loopback
 * test process is super_user and every assertion here passes vacuously.
 */
import { teardownHarper, type ContextWithHarper, type HarperContext } from '@harperfast/integration-testing';
import { ok, strictEqual } from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { after, before, suite, test } from 'node:test';
import WebSocket from 'ws';
import { restUrl, startAppHarper, VALID_CUSTOMER } from './helpers/app-fixture.ts';
import { get, post, register } from './helpers/session.ts';

/** What happened when we tried to subscribe. */
interface SubscribeAttempt {
	/** True when the socket opened AND delivered a frame before the timeout. */
	delivered: boolean;
	/** First frame received, if any. */
	frame?: string;
	/** Close code, if the server closed us. */
	closeCode?: number;
	/** Upgrade/transport error message, if the socket never opened. */
	error?: string;
}

/**
 * Open a WebSocket to `path` and report what the server did.
 *
 * Deliberately does not assert: a refusal can surface as an upgrade error, a
 * close, or an open socket that never yields a frame, and which one it is is a
 * property of Harper's transport rather than of this app. The tests below
 * assert on `delivered`, which is the security-relevant bit either way.
 */
function trySubscribe(harper: HarperContext, path: string, cookie?: string, ms = 3000): Promise<SubscribeAttempt> {
	const url = restUrl(harper, path).replace(/^http/, 'ws');
	const socket = new WebSocket(url, cookie ? { headers: { Cookie: cookie } } : undefined);

	return new Promise((resolve) => {
		const result: SubscribeAttempt = { delivered: false };
		const finish = () => {
			clearTimeout(timer);
			if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
			resolve(result);
		};
		const timer = setTimeout(finish, ms);

		socket.on('message', (data: Buffer) => {
			result.delivered = true;
			result.frame = data.toString('utf8').slice(0, 400);
			finish();
		});
		socket.on('close', (code: number) => {
			result.closeCode = code;
			finish();
		});
		socket.on('error', (error: Error) => {
			result.error = error.message;
			finish();
		});
	});
}

suite('subscription scoping', (ctx: ContextWithHarper) => {
	let fixtureDir: string;
	let aliceCookie: string | undefined;
	let bobCookie: string | undefined;
	let aliceOrderId: string;

	before(async () => {
		({ fixtureDir } = await startAppHarper(ctx, {
			config: { authentication: { authorizeLocal: false } },
		}));

		aliceCookie = await register(ctx.harper, 'alice.live');
		bobCookie = await register(ctx.harper, 'bob.live');

		// Give Alice a cart and an order to be leaked.
		const cart = await fetch(restUrl(ctx.harper, '/Cart/alice.live'), {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json', Accept: 'application/json', Cookie: aliceCookie! },
			body: JSON.stringify({ items: [{ slug: 'yx1-earphones', quantity: 1 }] }),
		});
		ok(cart.ok, `seeding Alice's cart should succeed, got ${cart.status}`);

		const { response } = await post(
			ctx.harper,
			'/Order/',
			{ customer: VALID_CUSTOMER, paymentMethod: 'cash-on-delivery', items: [{ slug: 'yx1-earphones', quantity: 1 }] },
			aliceCookie,
		);
		ok(response.ok, `seeding Alice's order should succeed, got ${response.status}`);
		aliceOrderId = ((await response.json()) as { id: string }).id;
	});

	after(async () => {
		await teardownHarper(ctx);
		if (fixtureDir) await rm(fixtureDir, { recursive: true, force: true });
	});

	test('the loopback super_user bypass is actually off', async () => {
		const response = await get(ctx.harper, '/Me');
		strictEqual(response.status, 401, 'an anonymous /Me must be unauthorized, or every assertion here is vacuous');
	});

	test('refuses an anonymous subscription to a customer cart', async () => {
		const attempt = await trySubscribe(ctx.harper, '/Cart/alice.live');
		strictEqual(attempt.delivered, false, `anonymous cart subscription leaked: ${attempt.frame}`);
	});

	test('refuses another customer a subscription to a cart that is not theirs', async () => {
		const attempt = await trySubscribe(ctx.harper, '/Cart/alice.live', bobCookie);
		strictEqual(attempt.delivered, false, `cross-customer cart subscription leaked: ${attempt.frame}`);
	});

	test('lets a customer subscribe to their own cart', async () => {
		const attempt = await trySubscribe(ctx.harper, '/Cart/alice.live', aliceCookie);
		ok(attempt.delivered, `owner was refused their own cart: close=${attempt.closeCode} error=${attempt.error}`);
	});

	test('refuses another customer a subscription to an order that is not theirs', async () => {
		const attempt = await trySubscribe(ctx.harper, `/Order/${aliceOrderId}`, bobCookie);
		strictEqual(attempt.delivered, false, `cross-customer order subscription leaked: ${attempt.frame}`);
	});

	test('refuses an anonymous subscription to orders', async () => {
		const attempt = await trySubscribe(ctx.harper, '/Order/', undefined);
		strictEqual(attempt.delivered, false, `anonymous order subscription leaked: ${attempt.frame}`);
	});

	test('lets a customer subscribe to their own order', async () => {
		const attempt = await trySubscribe(ctx.harper, `/Order/${aliceOrderId}`, aliceCookie);
		ok(attempt.delivered, `owner was refused their own order: close=${attempt.closeCode} error=${attempt.error}`);
	});

	test('keeps the public catalog subscribable, so the boundary is intentional and not blanket denial', async () => {
		const attempt = await trySubscribe(ctx.harper, '/Product/yx1-earphones');
		ok(attempt.delivered, `catalog subscription should stay public: close=${attempt.closeCode} error=${attempt.error}`);
	});
});
