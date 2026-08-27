import type { AuthUser, Credentials, OrderConfirmation, OrderPayload, OrderRecord, Product } from '@/lib/types.ts';
import type { CartAdjustment, CartLine } from '@shared/cart.ts';

// Low-level fetchers. Caching/dedup/state is handled by React Query (see queries.ts);
// these just talk to Harper's REST API and throw on failure.

// Accept must be JSON-specific: the Vite dev middleware serves the SPA
// index.html fallback for requests that accept */*.
const JSON_HEADERS = { Accept: 'application/json' };

/** Read a failed response's body as the error message, falling back to the status. */
async function failure(response: Response, fallback: string): Promise<Error> {
	const body = await response.text().catch(() => '');
	try {
		// Harper answers with a problem document for thrown errors, and plain text otherwise.
		const parsed = JSON.parse(body) as { title?: string; message?: string };
		return new Error(parsed.title ?? parsed.message ?? fallback);
	} catch {
		return new Error(body || fallback);
	}
}

async function sendJson<T>(method: string, path: string, body: unknown, fallback: string): Promise<T> {
	const response = await fetch(path, {
		method,
		headers: { ...JSON_HEADERS, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
	if (!response.ok) throw await failure(response, fallback);
	return (await response.json()) as T;
}

function postJson<T>(path: string, body: unknown, fallback: string): Promise<T> {
	return sendJson<T>('POST', path, body, fallback);
}

export async function fetchProducts(): Promise<Product[]> {
	const response = await fetch('/Product/?limit(100)', { headers: JSON_HEADERS });
	if (!response.ok) throw new Error(`Failed to load products (${response.status})`);
	const products = (await response.json()) as Product[];
	return products.sort((a, b) => a.ord - b.ord);
}

/**
 * The editable half of a catalog record.
 *
 * `id` is absent on purpose. A product created here is given its id by Harper,
 * while `slug` — what the storefront routes on — is a separate indexed
 * attribute. Letting the two diverge is exactly the case `getProductBySlug` in
 * `resources/lib/catalog.ts` exists to support, so the authoring UI must not
 * quietly re-couple them by inventing an id from the slug.
 *
 * `stock` and `lowStockThreshold` widen to `null` because "untracked" has to be
 * expressible. Omitting a key from a PATCH means "leave this alone", so
 * clearing a field needs an actual value to send, and `null` is one
 * `shared/inventory.ts` already reads as untracked (`typeof null !== 'number'`).
 */
export type ProductDraft = Omit<Product, 'id' | 'stock' | 'lowStockThreshold'> & {
	stock: number | null;
	lowStockThreshold: number | null;
};

/** Send a request whose response body the caller has no use for. */
async function send(method: string, path: string, body: unknown, fallback: string): Promise<void> {
	const response = await fetch(path, {
		method,
		headers: body === undefined ? JSON_HEADERS : { ...JSON_HEADERS, 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	if (!response.ok) throw await failure(response, fallback);
}

// Catalog authoring. These three calls are the `editor` role's insert/update/
// delete grants on Product (`resources/lib/roles.ts`); Harper checks them in
// `Table.allowCreate`/`allowUpdate`/`allowDelete` before the request reaches the
// table, so a customer's session is refused here no matter what the UI renders.

export function createProduct(draft: ProductDraft): Promise<void> {
	return send('POST', '/Product/', draft, 'Could not create the product');
}

/**
 * PATCH, never PUT: a PUT replaces the record, so any attribute this form does
 * not send — one added to the schema later, or one an operator set by hand —
 * would be erased by an edit that never mentioned it.
 */
export function updateProduct(id: string, changes: Partial<ProductDraft>): Promise<void> {
	return send('PATCH', `/Product/${encodeURIComponent(id)}`, changes, 'Could not save the product');
}

export function deleteProduct(id: string): Promise<void> {
	return send('DELETE', `/Product/${encodeURIComponent(id)}`, undefined, 'Could not delete the product');
}

export function createOrder(payload: OrderPayload): Promise<OrderConfirmation> {
	return postJson<OrderConfirmation>('/Order/', payload, 'Order failed');
}

/**
 * The caller's own orders.
 *
 * No `ownerUsername` filter is sent — `resources/Order.ts` scopes the query to
 * the session server-side, so asking for "all orders" is already asking for
 * "mine". A client-side filter here would be decoration, not enforcement.
 */
export async function fetchMyOrders(): Promise<OrderRecord[]> {
	const select = 'select(id,createdAt,items,total,shipping,vat,grandTotal,paymentMethod)';
	const response = await fetch(`/Order/?limit(100)&${select}`, { headers: JSON_HEADERS });
	if (response.status === 401 || response.status === 403) throw await failure(response, 'Sign in to view your orders');
	if (!response.ok) throw new Error(`Failed to load orders (${response.status})`);
	const orders = (await response.json()) as OrderRecord[];
	return orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

/** The signed-in user, or null when there is no session. */
export async function fetchMe(): Promise<AuthUser | null> {
	const response = await fetch('/Me', { headers: JSON_HEADERS });
	if (response.status === 401) return null;
	if (!response.ok) throw new Error(`Failed to load session (${response.status})`);
	return (await response.json()) as AuthUser;
}

export function signIn(credentials: Credentials): Promise<AuthUser> {
	return postJson<AuthUser>('/SignIn', credentials, 'Sign in failed');
}

export function signUp(credentials: Credentials): Promise<AuthUser> {
	return postJson<AuthUser>('/SignUp', credentials, 'Sign up failed');
}

export function signOut(): Promise<{ signedOut: boolean }> {
	return postJson<{ signedOut: boolean }>('/SignOut', {}, 'Sign out failed');
}

/** The server's view of a cart, plus anything stock forced it to change. */
export interface CartResult {
	id: string;
	items: CartLine[];
	adjustments: CartAdjustment[];
}

/**
 * Replace the stored cart.
 *
 * The cart is keyed by username, so the path names the owner and the server
 * checks it against the session — there is no cart id to hold onto.
 */
export function saveCart(username: string, items: CartLine[]): Promise<CartResult> {
	return sendJson<CartResult>('PUT', `/Cart/${encodeURIComponent(username)}`, { items }, 'Could not save your cart');
}

/**
 * Merge a guest cart into the stored one, keeping the larger quantity per slug.
 *
 * This is the sign-in path. Posting an empty list is the natural way to *read*
 * the stored cart on a reload — the merge is a no-op and the response is the
 * cart — so the storefront needs only this one call to adopt a session's cart.
 */
export function mergeCart(username: string, items: CartLine[]): Promise<CartResult> {
	return postJson<CartResult>(`/Cart/${encodeURIComponent(username)}`, { items }, 'Could not restore your cart');
}
