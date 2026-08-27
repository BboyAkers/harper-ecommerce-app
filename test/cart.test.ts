import { clampToStock, isValidLine, MAX_LINE_QUANTITY, mergeCartLines } from '../shared/cart.ts';
import { deepStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, test } from 'node:test';

/** Sort so assertions do not depend on Map iteration order. */
function bySlug(lines: { slug: string; quantity: number }[]) {
	return [...lines].sort((a, b) => a.slug.localeCompare(b.slug));
}

describe('isValidLine', () => {
	test('accepts a well-formed line', () => {
		ok(isValidLine({ slug: 'yx1-earphones', quantity: 2 }));
	});

	test('rejects a missing or empty slug', () => {
		ok(!isValidLine({ quantity: 1 }));
		ok(!isValidLine({ slug: '   ', quantity: 1 }));
	});

	test('rejects quantities outside 1..99', () => {
		ok(!isValidLine({ slug: 'yx1-earphones', quantity: 0 }));
		ok(!isValidLine({ slug: 'yx1-earphones', quantity: MAX_LINE_QUANTITY + 1 }));
	});

	test('rejects fractional quantities', () => {
		ok(!isValidLine({ slug: 'yx1-earphones', quantity: 1.5 }));
	});

	test('rejects non-objects', () => {
		ok(!isValidLine(null));
		ok(!isValidLine('yx1-earphones'));
	});
});

describe('mergeCartLines', () => {
	test('keeps lines that appear on only one side', () => {
		const merged = mergeCartLines([{ slug: 'a', quantity: 1 }], [{ slug: 'b', quantity: 2 }]);
		deepStrictEqual(bySlug(merged), [
			{ slug: 'a', quantity: 1 },
			{ slug: 'b', quantity: 2 },
		]);
	});

	test('takes the larger quantity rather than the sum', () => {
		// The guest cart arriving at sign-in is usually the same basket, not extra of it.
		const merged = mergeCartLines([{ slug: 'a', quantity: 2 }], [{ slug: 'a', quantity: 3 }]);
		deepStrictEqual(merged, [{ slug: 'a', quantity: 3 }]);
	});

	test('keeps the stored quantity when it is the larger one', () => {
		const merged = mergeCartLines([{ slug: 'a', quantity: 5 }], [{ slug: 'a', quantity: 1 }]);
		deepStrictEqual(merged, [{ slug: 'a', quantity: 5 }]);
	});

	test('never exceeds the per-line maximum', () => {
		const merged = mergeCartLines([{ slug: 'a', quantity: MAX_LINE_QUANTITY }], [{ slug: 'a', quantity: 50 }]);
		deepStrictEqual(merged, [{ slug: 'a', quantity: MAX_LINE_QUANTITY }]);
	});

	test('merging an empty cart changes nothing', () => {
		const stored = [{ slug: 'a', quantity: 2 }];
		deepStrictEqual(mergeCartLines(stored, []), stored);
		deepStrictEqual(mergeCartLines([], stored), stored);
	});
});

describe('clampToStock', () => {
	const stock = (levels: Record<string, number>) => (slug: string) => levels[slug] ?? 0;

	test('leaves a line that stock covers untouched', () => {
		const result = clampToStock([{ slug: 'a', quantity: 2 }], stock({ a: 5 }));
		deepStrictEqual(result.items, [{ slug: 'a', quantity: 2 }]);
		deepStrictEqual(result.adjustments, []);
	});

	test('reduces a line to what is left and reports it', () => {
		const result = clampToStock([{ slug: 'a', quantity: 9 }], stock({ a: 3 }));
		deepStrictEqual(result.items, [{ slug: 'a', quantity: 3 }]);
		deepStrictEqual(result.adjustments, [{ slug: 'a', requested: 9, available: 3 }]);
	});

	test('drops a sold-out line entirely rather than leaving it at zero', () => {
		const result = clampToStock([{ slug: 'a', quantity: 2 }], stock({ a: 0 }));
		deepStrictEqual(result.items, []);
		deepStrictEqual(result.adjustments, [{ slug: 'a', requested: 2, available: 0 }]);
	});

	test('treats an untracked product as unlimited', () => {
		const result = clampToStock([{ slug: 'a', quantity: 99 }], () => Number.POSITIVE_INFINITY);
		deepStrictEqual(result.items, [{ slug: 'a', quantity: 99 }]);
		deepStrictEqual(result.adjustments, []);
	});

	test('can empty the cart entirely while still reporting why', () => {
		// The case the cart dialog's banner placement depends on: every line is
		// sold out, so `items` is empty and the adjustments are the ONLY record of
		// what happened. Rendering that banner inside a non-empty branch showed
		// the customer "Your cart is empty" and no explanation at all.
		const result = clampToStock(
			[
				{ slug: 'a', quantity: 2 },
				{ slug: 'b', quantity: 1 },
			],
			stock({ a: 0, b: 0 }),
		);
		deepStrictEqual(result.items, []);
		deepStrictEqual(result.adjustments, [
			{ slug: 'a', requested: 2, available: 0 },
			{ slug: 'b', requested: 1, available: 0 },
		]);
	});

	test('clamps only the lines that need it', () => {
		const result = clampToStock(
			[
				{ slug: 'a', quantity: 1 },
				{ slug: 'b', quantity: 8 },
				{ slug: 'c', quantity: 2 },
			],
			stock({ a: 10, b: 2, c: 0 }),
		);
		deepStrictEqual(result.items, [
			{ slug: 'a', quantity: 1 },
			{ slug: 'b', quantity: 2 },
		]);
		strictEqual(result.adjustments.length, 2);
	});
});
