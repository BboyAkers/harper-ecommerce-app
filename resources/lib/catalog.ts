import { tables } from 'harper';
import type { Product } from '../../shared/types.ts';

export {
	availableStock,
	canFulfil,
	DEFAULT_LOW_STOCK_THRESHOLD,
	isLowStock,
	isSoldOut,
	isTracked,
} from '../../shared/inventory.ts';

/** A catalog record as stored. */
export type ProductRecord = Product;

/**
 * Harper's `search()` accepts a query descriptor (conditions/sort/limit/select),
 * but its published type only models `Id | RequestTarget`. Funnel every search
 * through here so the one unavoidable cast is documented in a single place
 * instead of being sprinkled across resources.
 */
export interface SearchQuery {
	conditions?: unknown[];
	sort?: unknown;
	select?: unknown[];
	limit?: number;
	offset?: number;
}

export function searchTable<T>(table: { search: (target: never) => AsyncIterable<unknown> }, query: SearchQuery) {
	return table.search(query as never) as AsyncIterable<T>;
}

/**
 * Look a product up by its `slug` attribute.
 *
 * This deliberately queries the `@indexed slug` attribute rather than calling
 * `tables.Product.get(slug)`. That shortcut only works while every seeded
 * record happens to set `id === slug`; a product created through the CMS gets a
 * generated id, and a primary-key lookup would then miss it entirely.
 */
export async function getProductBySlug(slug: string): Promise<ProductRecord | undefined> {
	if (typeof slug !== 'string' || slug.trim() === '') return undefined;
	const matches = searchTable<ProductRecord>(tables.Product, {
		conditions: [{ attribute: 'slug', value: slug }],
		limit: 1,
	});
	for await (const product of matches) return product;
	return undefined;
}
