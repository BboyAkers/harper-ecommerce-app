/**
 * Cart rules, shared by the Harper resource and the storefront.
 *
 * Like `shared/inventory.ts`, this deliberately imports nothing from `harper`:
 * the storefront applies the same merge and clamp rules optimistically, and the
 * server applies them authoritatively, from one definition.
 *
 * A stored cart line carries only a slug and a quantity. Price and display copy
 * are *not* persisted — they are read from the catalog, the same principle that
 * makes order pricing server-authoritative. A cart that remembered a price would
 * be a cart that could quote a stale one.
 */

export interface CartLine {
	slug: string;
	quantity: number;
}

/** A line the server had to reduce, so the UI can explain why. */
export interface CartAdjustment {
	slug: string;
	requested: number;
	available: number;
}

export const MAX_LINE_QUANTITY = 99;

/** True for a well-formed line: a non-empty slug and a whole quantity in range. */
export function isValidLine(line: unknown): line is CartLine {
	if (!line || typeof line !== 'object') return false;
	const { slug, quantity } = line as Partial<CartLine>;
	if (typeof slug !== 'string' || slug.trim() === '') return false;
	return Number.isInteger(quantity) && (quantity as number) >= 1 && (quantity as number) <= MAX_LINE_QUANTITY;
}

/**
 * Combine a stored cart with an incoming one, keeping the *larger* quantity for
 * a slug in both.
 *
 * Larger-of rather than sum: the common case is the same basket arriving twice —
 * a guest adds two headphones, then signs in on a device that already has them —
 * and summing would silently double the order. Someone who genuinely wants four
 * can say so; nobody wants to discover an extra two at checkout.
 */
export function mergeCartLines(stored: CartLine[], incoming: CartLine[]): CartLine[] {
	const merged = new Map<string, number>();
	for (const line of [...stored, ...incoming]) {
		const current = merged.get(line.slug) ?? 0;
		merged.set(line.slug, Math.min(MAX_LINE_QUANTITY, Math.max(current, line.quantity)));
	}
	return [...merged].map(([slug, quantity]) => ({ slug, quantity }));
}

/**
 * Reduce every line to what stock allows, reporting each reduction.
 *
 * Carts clamp where orders reject. An order is a decision the customer is making
 * right now, so an impossible quantity is an error worth a 409. A cart is a
 * holding area that the world changes underneath — if stock drops while an item
 * sits in it, refusing the write would leave the customer unable to so much as
 * remove the offending line.
 *
 * `available` returns Infinity for products that are not inventory-tracked.
 */
export function clampToStock(
	lines: CartLine[],
	available: (slug: string) => number,
): { items: CartLine[]; adjustments: CartAdjustment[] } {
	const items: CartLine[] = [];
	const adjustments: CartAdjustment[] = [];

	for (const line of lines) {
		const stock = available(line.slug);
		if (line.quantity <= stock) {
			items.push(line);
			continue;
		}
		adjustments.push({ slug: line.slug, requested: line.quantity, available: Math.max(0, stock) });
		// A sold-out product leaves the cart entirely rather than lingering at zero.
		if (stock >= 1) items.push({ slug: line.slug, quantity: Math.floor(stock) });
	}

	return { items, adjustments };
}
