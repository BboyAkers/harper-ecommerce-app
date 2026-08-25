/**
 * Unit tests for the inventory rules shared by the Order resource (which
 * enforces them) and the storefront (which renders them as stock badges).
 */
import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	availableStock,
	canFulfil,
	DEFAULT_LOW_STOCK_THRESHOLD,
	isLowStock,
	isSoldOut,
	isTracked,
} from '../shared/inventory.ts';

describe('availableStock', () => {
	it('reports the stock level for a tracked product', () => {
		strictEqual(availableStock({ stock: 7 }), 7);
		strictEqual(availableStock({ stock: 0 }), 0);
	});

	it('treats an unset stock field as unlimited, not as zero', () => {
		// Adding `stock` to the schema must not make existing products unorderable.
		strictEqual(availableStock({}), Number.POSITIVE_INFINITY);
		strictEqual(isTracked({}), false);
		strictEqual(isTracked({ stock: 0 }), true);
	});
});

describe('isSoldOut', () => {
	it('is true only for a tracked product at zero', () => {
		strictEqual(isSoldOut({ stock: 0 }), true);
		strictEqual(isSoldOut({ stock: 1 }), false);
		strictEqual(isSoldOut({}), false);
	});
});

describe('isLowStock', () => {
	it('uses the default threshold when the product sets none', () => {
		strictEqual(isLowStock({ stock: DEFAULT_LOW_STOCK_THRESHOLD }), true);
		strictEqual(isLowStock({ stock: DEFAULT_LOW_STOCK_THRESHOLD + 1 }), false);
	});

	it('honours a per-product threshold override', () => {
		// Seeded case: zx9-speaker has 8 units but a threshold of 10.
		strictEqual(isLowStock({ stock: 8, lowStockThreshold: 10 }), true);
		strictEqual(isLowStock({ stock: 8 }), false);
	});

	it('is false when sold out, so the two states never both show', () => {
		strictEqual(isLowStock({ stock: 0 }), false);
		strictEqual(isSoldOut({ stock: 0 }), true);
	});

	it('is false for an untracked product', () => {
		strictEqual(isLowStock({}), false);
	});
});

describe('canFulfil', () => {
	it('allows a quantity up to and including the available stock', () => {
		strictEqual(canFulfil({ stock: 3 }, 3), true);
		strictEqual(canFulfil({ stock: 3 }, 4), false);
	});

	it('rejects non-positive quantities', () => {
		strictEqual(canFulfil({ stock: 10 }, 0), false);
		strictEqual(canFulfil({ stock: 10 }, -1), false);
	});

	it('allows any positive quantity for an untracked product', () => {
		strictEqual(canFulfil({}, 999), true);
	});
});
