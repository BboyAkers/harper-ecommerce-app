// Order pricing rules, shared by the server and the checkout UI.
//
// `resources/Order.ts` is authoritative — it re-derives every total from the
// Product table so a tampered client payload cannot change what is charged.
// The checkout UI imports the same constants purely to preview those numbers,
// which is why they live here rather than being duplicated in both places.

export const SHIPPING = 50;
export const VAT_RATE = 0.2;

export interface OrderTotals {
	total: number;
	shipping: number;
	vat: number;
	grandTotal: number;
}

/**
 * Derive order totals from the summed line items.
 *
 * VAT is treated as *included* in the line prices, so it is reported for the
 * receipt but deliberately not added to `grandTotal`.
 */
export function computeTotals(itemsTotal: number): OrderTotals {
	return {
		total: itemsTotal,
		shipping: SHIPPING,
		vat: Math.round(itemsTotal * VAT_RATE),
		grandTotal: itemsTotal + SHIPPING,
	};
}
