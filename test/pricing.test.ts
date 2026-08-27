/**
 * Unit tests for order pricing. These are the numbers the server charges, so
 * they are pinned independently of any HTTP or database behaviour.
 */
import { deepStrictEqual, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHIPPING, VAT_RATE, computeTotals } from '../shared/pricing.ts';

describe('computeTotals', () => {
	it('adds flat shipping to the items total', () => {
		const { total, shipping, grandTotal } = computeTotals(1198);
		strictEqual(total, 1198);
		strictEqual(shipping, SHIPPING);
		strictEqual(grandTotal, 1248);
	});

	it('reports VAT without adding it to the grand total (prices are VAT-inclusive)', () => {
		const { vat, total, grandTotal } = computeTotals(5698);
		strictEqual(vat, 1140); // round(5698 * 0.2)
		strictEqual(grandTotal, total + SHIPPING);
	});

	it('rounds VAT to the nearest whole unit', () => {
		strictEqual(computeTotals(599).vat, 120); // 119.8 -> 120
		strictEqual(computeTotals(1).vat, 0); // 0.2 -> 0
		strictEqual(computeTotals(3).vat, 1); // 0.6 -> 1
	});

	it('still charges shipping on a zero-value basket', () => {
		deepStrictEqual(computeTotals(0), { total: 0, shipping: SHIPPING, vat: 0, grandTotal: SHIPPING });
	});

	it('matches the checkout summary the storefront renders', () => {
		// The storefront calls this same function, so a drift here is a drift in
		// what the customer was shown versus what the server charged.
		const itemsTotal = 599 * 2 + 4500;
		const { vat, grandTotal } = computeTotals(itemsTotal);
		strictEqual(vat, Math.round(itemsTotal * VAT_RATE));
		strictEqual(grandTotal, itemsTotal + SHIPPING);
	});
});
