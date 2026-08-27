/**
 * Unit tests for the catalog editor's form conversion and validation.
 *
 * The module under test imports nothing at runtime — its two imports are
 * `import type`, which Node's type stripping erases — so the rules can be
 * exercised without a browser, a router or a database.
 */
import { deepStrictEqual, notStrictEqual, ok, strictEqual } from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
	blankValues,
	buildDraft,
	type ProductFormValues,
	relatedFrom,
	valuesFromProduct,
} from '../src/pages/admin/product-draft.ts';
import type { Product } from '../shared/types.ts';

function imageSet(prefix: string) {
	return { mobile: `${prefix}/mobile.jpg`, tablet: `${prefix}/tablet.jpg`, desktop: `${prefix}/desktop.jpg` };
}

/** A complete stored record, of the shape `data/products.json` ships. */
function product(overrides: Partial<Product> = {}): Product {
	return {
		id: '7f3c1a90-0000-4000-8000-000000000001',
		ord: 3,
		slug: 'zx9-speaker',
		name: 'ZX9 Speaker',
		shortName: 'ZX9',
		category: 'speakers',
		new: true,
		price: 4500,
		description: 'A speaker.',
		features: 'Line one.\n\nLine two.',
		includes: [
			{ quantity: 2, item: 'Speaker unit' },
			{ quantity: 1, item: 'User manual' },
		],
		image: imageSet('/assets/zx9/product'),
		categoryImage: imageSet('/assets/zx9/category'),
		gallery: {
			first: imageSet('/assets/zx9/gallery-1'),
			second: imageSet('/assets/zx9/gallery-2'),
			third: imageSet('/assets/zx9/gallery-3'),
		},
		others: [{ slug: 'zx7-speaker', name: 'ZX7 Speaker', shortName: 'ZX7', image: imageSet('/assets/shared/zx7') }],
		stock: 12,
		lowStockThreshold: 4,
		...overrides,
	};
}

/** A form filled in enough to be valid, so a test can break exactly one thing. */
function validValues(overrides: Partial<ProductFormValues> = {}): ProductFormValues {
	return { ...valuesFromProduct(product()), ...overrides };
}

describe('valuesFromProduct', () => {
	it('round-trips a stored record through the form without changing it', () => {
		// The property that matters most: opening a product and saving it back
		// must be a no-op. Anything this loses is data an unrelated edit destroys.
		const stored = product();
		const { errors, draft } = buildDraft(valuesFromProduct(stored), []);

		deepStrictEqual(errors, {});
		const { id: _id, ...withoutId } = stored;
		deepStrictEqual(draft, withoutId);
	});

	it('represents an untracked product as a blank field, not a zero', () => {
		const values = valuesFromProduct(product({ stock: undefined, lowStockThreshold: undefined }));
		strictEqual(values.stock, '');
		strictEqual(values.lowStockThreshold, '');

		// And converts back to null rather than 0 — `shared/inventory.ts` reads a
		// stock of 0 as sold out, which is the opposite of untracked.
		const { draft } = buildDraft(values, []);
		strictEqual(draft?.stock, null);
		strictEqual(draft?.lowStockThreshold, null);
	});

	it('keeps a stock of zero distinct from an untracked product', () => {
		strictEqual(valuesFromProduct(product({ stock: 0 })).stock, '0');
		strictEqual(buildDraft(validValues({ stock: '0' }), []).draft?.stock, 0);
	});

	it('falls back to a known category rather than selecting nothing', () => {
		const values = valuesFromProduct(product({ category: 'turntables' as Product['category'] }));
		strictEqual(values.category, 'headphones');
	});

	it('tolerates a record missing its nested objects', () => {
		const sparse = { id: 'x', slug: 'x', name: 'X', shortName: 'X' } as unknown as Product;
		const values = valuesFromProduct(sparse);

		deepStrictEqual(values.image, { mobile: '', tablet: '', desktop: '' });
		deepStrictEqual(values.gallery.second, { mobile: '', tablet: '', desktop: '' });
		deepStrictEqual(values.includes, []);
		deepStrictEqual(values.others, []);
	});

	it('copies nested objects instead of sharing them with the record', () => {
		const stored = product();
		const values = valuesFromProduct(stored);

		notStrictEqual(values.image, stored.image);
		notStrictEqual(values.gallery.first, stored.gallery.first);
		notStrictEqual(values.others[0].image, stored.others[0].image);

		// And the draft is a further copy, so a later edit cannot reach the cache.
		const { draft } = buildDraft(values, []);
		notStrictEqual(draft?.image, values.image);
		notStrictEqual(draft?.gallery.third, values.gallery.third);
	});
});

describe('buildDraft slug rules', () => {
	it('requires a slug', () => {
		strictEqual(buildDraft(validValues({ slug: '   ' }), []).errors.slug, 'Required.');
	});

	it('rejects anything that is not a lowercase hyphenated slug', () => {
		for (const slug of ['ZX9 Speaker', 'zx9_speaker', 'zx9--speaker', '-zx9', 'zx9-']) {
			ok(buildDraft(validValues({ slug }), []).errors.slug, `expected ${slug} to be rejected`);
		}
	});

	it('rejects a slug another product already uses', () => {
		const taken = [product({ id: 'other', slug: 'zx7-speaker' })];
		strictEqual(
			buildDraft(validValues({ slug: 'zx7-speaker' }), taken).errors.slug,
			'Another product already uses this slug.',
		);
		// The record being edited is excluded by the caller, so its own slug is free.
		deepStrictEqual(buildDraft(validValues({ slug: 'zx9-speaker' }), taken).errors, {});
	});

	it('trims the slug before both checking and storing it', () => {
		strictEqual(buildDraft(validValues({ slug: '  zx9-speaker  ' }), []).draft?.slug, 'zx9-speaker');
	});
});

describe('buildDraft numeric rules', () => {
	it('requires a whole, non-negative price', () => {
		strictEqual(buildDraft(validValues({ price: '' }), []).errors.price, 'Required.');
		for (const price of ['12.5', '-1', '12abc', 'lots']) {
			ok(buildDraft(validValues({ price }), []).errors.price, `expected ${price} to be rejected`);
		}
		strictEqual(buildDraft(validValues({ price: '0' }), []).draft?.price, 0);
	});

	it('never reports a field valid and then stores something else', () => {
		// The reason validation and conversion share one pass: a second parse can
		// disagree with the first about a value like this.
		const { errors, draft } = buildDraft(validValues({ price: '12abc' }), []);
		ok(errors.price);
		strictEqual(draft, undefined);
	});

	it('accepts a blank stock but not a malformed one', () => {
		deepStrictEqual(buildDraft(validValues({ stock: '' }), []).errors, {});
		ok(buildDraft(validValues({ stock: '-3' }), []).errors.stock);
		ok(buildDraft(validValues({ lowStockThreshold: '2.5' }), []).errors.lowStockThreshold);
	});
});

describe('buildDraft included items', () => {
	it('drops rows that were added and never filled in', () => {
		const { errors, draft } = buildDraft(
			validValues({
				includes: [
					{ quantity: '1', item: 'Speaker unit' },
					{ quantity: '', item: '' },
				],
			}),
			[],
		);
		deepStrictEqual(errors, {});
		deepStrictEqual(draft?.includes, [{ quantity: 1, item: 'Speaker unit' }]);
	});

	it('rejects a half-filled row rather than silently discarding it', () => {
		ok(buildDraft(validValues({ includes: [{ quantity: '2', item: '  ' }] }), []).errors.includes);
		ok(buildDraft(validValues({ includes: [{ quantity: '', item: 'Cable' }] }), []).errors.includes);
		ok(buildDraft(validValues({ includes: [{ quantity: '0', item: 'Cable' }] }), []).errors.includes);
	});
});

describe('blankValues', () => {
	it('produces a form that reports what a new product still needs', () => {
		const { errors, draft } = buildDraft(blankValues(), []);
		strictEqual(draft, undefined);
		deepStrictEqual(Object.keys(errors).sort(), ['description', 'name', 'price', 'shortName', 'slug']);
	});

	it('gives each image set its own object', () => {
		const values = blankValues();
		notStrictEqual(values.image, values.categoryImage);
		notStrictEqual(values.gallery.first, values.gallery.second);
	});
});

describe('relatedFrom', () => {
	it('snapshots the referenced product, imaging it from that product', () => {
		// Not from `/assets/shared/…`: that convention only has files behind it for
		// the products shipped with the demo.
		deepStrictEqual(relatedFrom(product()), {
			slug: 'zx9-speaker',
			name: 'ZX9 Speaker',
			shortName: 'ZX9',
			image: imageSet('/assets/zx9/product'),
		});
	});
});
