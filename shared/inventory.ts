// Pure inventory rules, shared by the Harper resources and the storefront.
//
// Deliberately free of any `harper` import so the storefront can render stock
// badges from the same logic the server enforces, and so these can be unit
// tested without booting a database.

import { MAX_LINE_QUANTITY } from './cart.ts';
import type { Product } from './types.ts';

/** Applied when a product does not set its own `lowStockThreshold`. */
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

/** Just the inventory fields, so callers can pass a partial record. */
export type StockLevel = Pick<Product, 'stock' | 'lowStockThreshold'>;

/**
 * Units on hand. An unset `stock` means the product is not inventory-tracked,
 * which reads as unlimited rather than zero — otherwise adding the field to the
 * schema would have made every existing product unorderable.
 */
export function availableStock(product: StockLevel): number {
	return typeof product.stock === 'number' ? product.stock : Number.POSITIVE_INFINITY;
}

/** True when the product is inventory-tracked at all. */
export function isTracked(product: StockLevel): boolean {
	return typeof product.stock === 'number';
}

/** True when a tracked product has run out. */
export function isSoldOut(product: StockLevel): boolean {
	return availableStock(product) <= 0;
}

/** True when a tracked product is at or below its alert floor (and not yet out). */
export function isLowStock(product: StockLevel): boolean {
	const stock = availableStock(product);
	if (!Number.isFinite(stock) || stock <= 0) return false;
	return stock <= (product.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD);
}

/** Whether `quantity` can be fulfilled right now. */
export function canFulfil(product: StockLevel, quantity: number): boolean {
	return quantity > 0 && quantity <= availableStock(product);
}

/**
 * How a product's inventory reads to a shopper.
 *
 * One vocabulary, derived here, so the badge on a listing tile, the label on a
 * product page, the cart's adjustment copy and the low-stock job all classify
 * stock the same way. Five call sites each deciding what "low" means is five
 * chances for them to disagree.
 */
export type StockState = 'untracked' | 'in-stock' | 'low' | 'sold-out';

export function stockState(product: StockLevel): StockState {
	if (!isTracked(product)) return 'untracked';
	if (isSoldOut(product)) return 'sold-out';
	return isLowStock(product) ? 'low' : 'in-stock';
}

/**
 * Customer-facing copy for a product's stock, or `null` when there is nothing
 * worth saying — an untracked or comfortably-stocked product gets no badge
 * rather than a reassuring one nobody needs to read.
 */
export function stockLabel(product: StockLevel): string | null {
	switch (stockState(product)) {
		case 'sold-out':
			return 'Sold out';
		case 'low':
			return `Only ${availableStock(product)} left`;
		default:
			return null;
	}
}

/**
 * The largest quantity a customer may put in one cart line right now.
 *
 * Bounded by both stock and the per-line cap, so a caller can hand this straight
 * to a quantity control without knowing which limit is binding. Untracked
 * products yield the per-line cap, because `availableStock` reports Infinity.
 */
export function maxOrderable(product: StockLevel): number {
	return Math.min(availableStock(product), MAX_LINE_QUANTITY);
}
