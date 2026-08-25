// Pure inventory rules, shared by the Harper resources and the storefront.
//
// Deliberately free of any `harper` import so the storefront can render stock
// badges from the same logic the server enforces, and so these can be unit
// tested without booting a database.

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
