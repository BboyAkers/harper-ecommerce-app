import type { ProductDraft } from '@/lib/api.ts';
import type { Category, Gallery, ImageSet, IncludedItem, Product, RelatedProduct } from '@/lib/types.ts';

// Conversion and validation for the catalog editor's form, kept apart from the
// React that renders it: this is the half with rules in it, and it is the half
// worth reading on its own.

export const CATEGORIES: readonly Category[] = ['headphones', 'speakers', 'earphones'];
export const IMAGE_SIZES = ['mobile', 'tablet', 'desktop'] as const;
export const GALLERY_SLOTS = ['first', 'second', 'third'] as const;

/**
 * The form's own shape, in which every numeric field is a string.
 *
 * An `<input type="number">` reports `""` while it is being cleared and a
 * half-typed value as `NaN`, so binding one straight to a number makes the
 * field fight the person typing in it — a backspace becomes a `0` that then has
 * to be deleted again. The strings are parsed exactly once, at submit, by
 * `buildDraft`.
 */
export interface ProductFormValues {
	slug: string;
	name: string;
	shortName: string;
	category: Category;
	new: boolean;
	ord: string;
	price: string;
	stock: string;
	lowStockThreshold: string;
	description: string;
	features: string;
	includes: { quantity: string; item: string }[];
	image: ImageSet;
	categoryImage: ImageSet;
	gallery: Gallery;
	others: RelatedProduct[];
}

export type FieldErrors = Partial<Record<keyof ProductFormValues, string>>;

/** A complete `ImageSet`, whatever the record actually stored. */
function imageSet(value: Partial<ImageSet> | undefined): ImageSet {
	return { mobile: value?.mobile ?? '', tablet: value?.tablet ?? '', desktop: value?.desktop ?? '' };
}

function galleryOf(value: Partial<Gallery> | undefined): Gallery {
	return { first: imageSet(value?.first), second: imageSet(value?.second), third: imageSet(value?.third) };
}

/** A blank form, for the create route. */
export function blankValues(): ProductFormValues {
	return {
		slug: '',
		name: '',
		shortName: '',
		category: 'headphones',
		new: false,
		ord: '0',
		price: '',
		stock: '',
		lowStockThreshold: '',
		description: '',
		features: '',
		includes: [],
		image: imageSet(undefined),
		categoryImage: imageSet(undefined),
		gallery: galleryOf(undefined),
		others: [],
	};
}

/**
 * A stored record as form values.
 *
 * Every nested object is rebuilt rather than referenced. The form updates its
 * state immutably, but two fields sharing one `ImageSet` object would still let
 * an edit to either show up in both. Absent fields become `""` so React never
 * watches a controlled input turn uncontrolled — which is also what makes this
 * safe against a record that predates a column.
 */
export function valuesFromProduct(product: Product): ProductFormValues {
	return {
		slug: product.slug ?? '',
		name: product.name ?? '',
		shortName: product.shortName ?? '',
		// A record holding some other category would otherwise select nothing at
		// all, and silently rewrite itself to the first option on the next save.
		category: CATEGORIES.includes(product.category) ? product.category : 'headphones',
		new: Boolean(product.new),
		ord: String(product.ord ?? 0),
		price: product.price === undefined || product.price === null ? '' : String(product.price),
		stock: typeof product.stock === 'number' ? String(product.stock) : '',
		lowStockThreshold: typeof product.lowStockThreshold === 'number' ? String(product.lowStockThreshold) : '',
		description: product.description ?? '',
		features: product.features ?? '',
		includes: (product.includes ?? []).map((entry) => ({
			quantity: String(entry.quantity ?? 1),
			item: entry.item ?? '',
		})),
		image: imageSet(product.image),
		categoryImage: imageSet(product.categoryImage),
		gallery: galleryOf(product.gallery),
		others: (product.others ?? []).map((entry) => ({ ...entry, image: imageSet(entry.image) })),
	};
}

/**
 * A picked product as a related-product snapshot.
 *
 * The image is taken from the referenced product's own `image` set. The six
 * seeded records instead point at `/assets/shared/…`, a convention that only
 * has files behind it for the products shipped with the demo — following it for
 * a CMS-created product would store the URL of an image nobody ever uploaded.
 * The picker never rewrites an entry that is already on the record, so this
 * applies only to a newly-added one.
 */
export function relatedFrom(product: Product): RelatedProduct {
	return {
		slug: product.slug,
		name: product.name,
		shortName: product.shortName,
		image: imageSet(product.image),
	};
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** `null` for blank, `undefined` for anything that is not a whole number ≥ 0. */
function wholeNumber(value: string): number | null | undefined {
	const trimmed = value.trim();
	if (trimmed === '') return null;
	const parsed = Number(trimmed);
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * Validate the form and convert it to a draft in a single pass.
 *
 * Returning the draft next to the errors is what keeps the parse in one place.
 * A separate validator would have to parse every numeric field a second time,
 * and could then disagree with the converter about what a value like `"12abc"`
 * means — the classic way a form reports itself valid and saves something else.
 *
 * `otherProducts` is the catalog minus the record being edited, used only for
 * the slug collision check.
 */
export function buildDraft(
	values: ProductFormValues,
	otherProducts: Product[],
): { errors: FieldErrors; draft?: ProductDraft } {
	const errors: FieldErrors = {};

	const slug = values.slug.trim();
	if (!slug) errors.slug = 'Required.';
	else if (!SLUG_PATTERN.test(slug)) errors.slug = 'Lowercase letters, numbers and single hyphens only.';
	// Not enforced by the database: `slug` is `@indexed`, not unique, and
	// `getProductBySlug` returns the first match — so a duplicate would quietly
	// shadow the older product rather than fail a write. This is the only place
	// it gets caught, which is worth knowing before trusting it too far: two
	// editors saving at once can still both pass this check.
	else if (otherProducts.some((product) => product.slug === slug)) {
		errors.slug = 'Another product already uses this slug.';
	}

	const name = values.name.trim();
	if (!name) errors.name = 'Required.';

	const shortName = values.shortName.trim();
	if (!shortName) errors.shortName = 'Required.';

	const description = values.description.trim();
	if (!description) errors.description = 'Required.';

	const price = wholeNumber(values.price);
	if (price === null) errors.price = 'Required.';
	else if (price === undefined) errors.price = 'Whole dollars, zero or more.';

	const ord = wholeNumber(values.ord);
	if (ord === null) errors.ord = 'Required.';
	else if (ord === undefined) errors.ord = 'A whole number, zero or more.';

	const stock = wholeNumber(values.stock);
	if (stock === undefined) errors.stock = 'A whole number, or blank to leave it untracked.';

	const lowStockThreshold = wholeNumber(values.lowStockThreshold);
	if (lowStockThreshold === undefined) errors.lowStockThreshold = 'A whole number, or blank for the default.';

	// A row that was added and never filled in is dropped, not rejected. A
	// half-filled one is rejected, because dropping it would throw away what the
	// editor did type without ever saying so.
	const includes: IncludedItem[] = [];
	for (const entry of values.includes) {
		const item = entry.item.trim();
		const quantity = wholeNumber(entry.quantity);
		if (!item && (quantity === null || quantity === 0)) continue;
		if (!item || quantity === null || quantity === undefined || quantity < 1) {
			errors.includes = 'Every included item needs a description and a quantity of at least one.';
			break;
		}
		includes.push({ quantity, item });
	}

	if (Object.keys(errors).length > 0) return { errors };

	// Reachable only when every parse above succeeded; the assertions restate
	// what the checks have already guaranteed, which TypeScript cannot see
	// through the aggregated error object.
	return {
		errors,
		draft: {
			slug,
			name,
			shortName,
			category: values.category,
			new: values.new,
			ord: ord as number,
			price: price as number,
			stock: stock as number | null,
			lowStockThreshold: lowStockThreshold as number | null,
			description,
			features: values.features.trim(),
			includes,
			image: { ...values.image },
			categoryImage: { ...values.categoryImage },
			gallery: {
				first: { ...values.gallery.first },
				second: { ...values.gallery.second },
				third: { ...values.gallery.third },
			},
			others: values.others.map((entry) => ({ ...entry, image: { ...entry.image } })),
		},
	};
}
