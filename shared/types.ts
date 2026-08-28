// Canonical domain types for the storefront and the Harper resources.
//
// These are hand-written rather than taken from `schemas/types.ts` because the
// schema codegen emits references to the embedded object types (`ImageSet`,
// `OrderItem`, `Gallery`, …) without ever declaring them, so that file does not
// type-check on its own. Keeping one definition here is also what stops the
// client and server shapes from drifting.

export interface ImageSet {
	mobile: string;
	tablet: string;
	desktop: string;
}

export interface IncludedItem {
	quantity: number;
	item: string;
}

export interface Gallery {
	first: ImageSet;
	second: ImageSet;
	third: ImageSet;
}

export interface RelatedProduct {
	slug: string;
	name: string;
	shortName: string;
	image: ImageSet;
}

export type Category = 'headphones' | 'speakers' | 'earphones';

export interface Product {
	id: string;
	ord: number;
	slug: string;
	name: string;
	shortName: string;
	category: Category;
	new: boolean;
	price: number;
	description: string;
	features: string;
	includes: IncludedItem[];
	image: ImageSet;
	categoryImage: ImageSet;
	gallery: Gallery;
	others: RelatedProduct[];

	/** Units on hand. Unset means the product is not inventory-tracked. */
	stock?: number;
	/** Alert floor; falls back to DEFAULT_LOW_STOCK_THRESHOLD when unset. */
	lowStockThreshold?: number;
}

export interface CartItem {
	slug: string;
	shortName: string;
	price: number;
	image: string;
	quantity: number;
	/** Carried from the catalog so the cart can bound its quantity control. */
	stock?: number;
	lowStockThreshold?: number;
}

export interface OrderCustomer {
	name: string;
	email: string;
	phone: string;
	address: string;
	zip: string;
	city: string;
	country: string;
}

export type PaymentMethod = 'e-money' | 'cash-on-delivery';

export interface OrderItem {
	slug: string;
	name: string;
	price: number;
	quantity: number;
	image: string;
}

export interface OrderPayload {
	customer: OrderCustomer;
	paymentMethod: PaymentMethod;
	eMoneyNumber?: string;
	items: { slug: string; quantity: number }[];
}

export interface OrderConfirmation {
	id: string;
	items: OrderItem[];
	total: number;
	shipping: number;
	vat: number;
	grandTotal: number;
}

/**
 * An order as stored. `OrderConfirmation` is the subset the checkout screen
 * needs; order history reads the whole record back.
 */
export interface OrderRecord extends OrderConfirmation {
	createdAt: string;
	/** Set from the session at checkout; absent on guest orders. */
	ownerUsername?: string;
	customer: OrderCustomer;
	paymentMethod: PaymentMethod;
	eMoneyNumber?: string;
}

/** The signed-in user, as reported by `GET /Me`. */
export interface AuthUser {
	username: string;
	role?: string;
}

/**
 * What the sign-in and sign-up forms submit.
 *
 * The field is `email`, not `username`: an account is identified by its email
 * address, and `resources/Auth.ts` stores that address *as* the Harper username.
 * So `AuthUser.username` above is the same string read back — the name stays
 * because it is Harper's users-table key, not because there is a second
 * identifier.
 */
export interface Credentials {
	email: string;
	password: string;
}
