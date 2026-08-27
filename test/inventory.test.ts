/**
 * Unit tests for the inventory rules shared by the Order resource (which
 * enforces them) and the storefront (which renders them as stock badges).
 */
import { strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MAX_LINE_QUANTITY } from '../shared/cart.ts';
import {
	availableStock,
	canFulfil,
	DEFAULT_LOW_STOCK_THRESHOLD,
	isLowStock,
	isSoldOut,
	isTracked,
	maxOrderable,
	stockLabel,
	stockState,
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

describe('stockState', () => {
	it('classifies each state exactly once', () => {
		strictEqual(stockState({}), 'untracked');
		strictEqual(stockState({ stock: 0 }), 'sold-out');
		strictEqual(stockState({ stock: DEFAULT_LOW_STOCK_THRESHOLD }), 'low');
		strictEqual(stockState({ stock: DEFAULT_LOW_STOCK_THRESHOLD + 1 }), 'in-stock');
	});

	it('honours a per-product threshold', () => {
		// Seeded case: zx9-speaker has 8 units but a threshold of 10.
		strictEqual(stockState({ stock: 8, lowStockThreshold: 10 }), 'low');
		strictEqual(stockState({ stock: 8 }), 'in-stock');
	});
});

describe('stockLabel', () => {
	it('says nothing when there is nothing worth saying', () => {
		// No badge beats a reassuring badge nobody needs to read.
		strictEqual(stockLabel({}), null);
		strictEqual(stockLabel({ stock: 42 }), null);
	});

	it('names the two states a shopper needs to act on', () => {
		strictEqual(stockLabel({ stock: 0 }), 'Sold out');
		strictEqual(stockLabel({ stock: 3 }), 'Only 3 left');
		strictEqual(stockLabel({ stock: 1 }), 'Only 1 left');
	});

	it('reports the real count when a threshold override widens the low band', () => {
		strictEqual(stockLabel({ stock: 8, lowStockThreshold: 10 }), 'Only 8 left');
	});
});

describe('maxOrderable', () => {
	it('is bounded by stock when stock is the tighter limit', () => {
		strictEqual(maxOrderable({ stock: 3 }), 3);
		strictEqual(maxOrderable({ stock: 0 }), 0);
	});

	it('is bounded by the per-line cap when stock is plentiful', () => {
		// Never let a quantity control offer more than one line may hold.
		strictEqual(maxOrderable({ stock: 500 }), MAX_LINE_QUANTITY);
		strictEqual(maxOrderable({}), MAX_LINE_QUANTITY);
	});

	it('agrees with canFulfil at the boundary', () => {
		const product = { stock: 4 };
		const max = maxOrderable(product);
		strictEqual(canFulfil(product, max), true);
		strictEqual(canFulfil(product, max + 1), false);
	});
});
