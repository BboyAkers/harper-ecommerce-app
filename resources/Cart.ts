import { tables } from './lib/tables.ts';
import { type CartAdjustment, type CartLine, clampToStock, isValidLine, mergeCartLines } from '../shared/cart.ts';
import { availableStock, getProductBySlug } from './lib/catalog.ts';
import { badRequest, notFound } from './lib/errors.ts';
import { isSuperUser, requireUser } from './lib/session.ts';

/**
 * A per-customer server-side cart.
 *
 * The primary key is the owner's username, which is what makes this safe: there
 * is no cart id to guess or tamper with, and the ownership check below is a
 * string comparison rather than a lookup. It also means a customer has exactly
 * one cart, shared across every device they sign in on.
 *
 * Stored lines carry only slug and quantity — see `shared/cart.ts` for why.
 */

interface CartRecord {
	id: string;
	items?: CartLine[];
	updatedAt?: string;
}

/** What every write returns: the stored cart plus anything stock forced us to change. */
interface CartResult {
	id: string;
	items: CartLine[];
	adjustments: CartAdjustment[];
}

/** Read an untrusted body into cart lines. */
function readLines(body: unknown): CartLine[] {
	const items = Array.isArray(body) ? body : (body as { items?: unknown })?.items;
	if (!Array.isArray(items)) badRequest('Cart body must contain an items array');
	if (items.length > 50) badRequest('A cart cannot hold more than 50 distinct products');

	const lines: CartLine[] = [];
	for (const item of items) {
		if (!isValidLine(item)) badRequest('Each cart item needs a slug and a whole quantity between 1 and 99');
		// Last write wins for a repeated slug; the client should not send duplicates,
		// but a merged payload is easier to accept than to reject.
		const existing = lines.findIndex((line) => line.slug === item.slug);
		if (existing === -1) lines.push({ slug: item.slug, quantity: item.quantity });
		else lines[existing] = { slug: item.slug, quantity: item.quantity };
	}
	return lines;
}

/**
 * Resolve every slug against the catalog and clamp quantities to stock.
 *
 * An unknown slug is a client bug rather than a stock condition, so it is a 400
 * — silently dropping it would leave the customer staring at a cart that keeps
 * losing an item with no explanation.
 */
async function reconcile(lines: CartLine[]): Promise<{ items: CartLine[]; adjustments: CartAdjustment[] }> {
	const stock = new Map<string, number>();
	for (const line of lines) {
		const product = await getProductBySlug(line.slug);
		if (!product) badRequest(`Unknown product "${line.slug}"`);
		stock.set(line.slug, availableStock(product));
	}
	return clampToStock(lines, (slug) => stock.get(slug) ?? 0);
}

export class Cart extends tables.Cart {
	// Opens the endpoint; every method below authorizes against the session. The
	// inherited Table.allowRead would enforce only the role's table-level Cart
	// permission, which cannot express "your own cart".
	allowRead() {
		return true;
	}

	allowCreate() {
		return true;
	}

	allowUpdate() {
		return true;
	}

	allowDelete() {
		return true;
	}

	/**
	 * The username whose cart this request may touch.
	 *
	 * Anonymous callers are refused outright — guests keep their cart in
	 * localStorage and never reach this resource. A super_user may address any
	 * cart, which is what lets support and the CMS inspect one.
	 */
	private owner(): string {
		const user = requireUser(this.getCurrentUser(), 'Sign in to use a saved cart');
		const requested = this.getId();
		if (requested == null || requested === '') badRequest('Address a cart as /Cart/<username>');
		if (String(requested) !== user.username && !isSuperUser(user)) {
			// 404 rather than 403: usernames are guessable, and a 403 would confirm
			// which of them have carts.
			notFound('Cart not found');
		}
		return String(requested);
	}

	async get() {
		const id = this.owner();
		const record = (await super.get()) as CartRecord | undefined | null;
		// A customer who has never saved a cart has an empty one, not a missing one.
		return { id, items: record?.items ?? [], updatedAt: record?.updatedAt };
	}

	/** Replace the cart wholesale. This is how the storefront syncs local edits. */
	async put(data: unknown): Promise<CartResult> {
		const id = this.owner();
		const { items, adjustments } = await reconcile(readLines(await data));
		await this.store(id, items);
		return { id, items, adjustments };
	}

	/**
	 * Merge the posted cart into the stored one, keeping the larger quantity per
	 * slug. This is the sign-in path: a guest's localStorage cart arrives here and
	 * joins whatever the account already held.
	 */
	async post(data: unknown): Promise<CartResult> {
		const id = this.owner();
		const stored = ((await super.get()) as CartRecord | undefined | null)?.items ?? [];
		const merged = mergeCartLines(stored, readLines(await data));
		const { items, adjustments } = await reconcile(merged);
		await this.store(id, items);
		return { id, items, adjustments };
	}

	/**
	 * Discard the cart.
	 *
	 * The row is removed rather than blanked. `get` already reports a missing cart
	 * as an empty one, so this is invisible to clients, and it avoids leaving a
	 * record behind for every account that ever emptied a cart. The storefront's
	 * "remove all" writes an empty list instead, which is the same thing to a
	 * customer but keeps the record warm for the next add.
	 */
	async delete() {
		this.owner();
		await super.delete(undefined as never);
		return true;
	}

	/**
	 * Write the cart through the base resource.
	 *
	 * `super.put(record, undefined)` is deliberate. The instance signature is
	 * `put(target, record)`, but Harper dispatches instance puts as `put(data, query)`
	 * and Table detects the swap by checking whether the *second* argument is a
	 * record — an undefined second argument selects that path, which stages the
	 * record and saves it in the request's transaction.
	 */
	private store(id: string, items: CartLine[]) {
		return super.put({ id, items } as never, undefined as never);
	}
}
