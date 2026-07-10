import type { OrderConfirmation, OrderPayload, Product } from '@/lib/types.ts';

let productsPromise: Promise<Product[]> | undefined;

export function getProducts(): Promise<Product[]> {
	// Accept must be JSON-specific: the Vite dev middleware serves the SPA
	// index.html fallback for requests that accept */*.
	productsPromise ??= fetch('/Product/?limit(100)', { headers: { Accept: 'application/json' } }).then(async (response) => {
		if (!response.ok) {
			productsPromise = undefined;
			throw new Error(`Failed to load products (${response.status})`);
		}
		const products = (await response.json()) as Product[];
		return products.sort((a, b) => a.ord - b.ord);
	});
	return productsPromise;
}

export async function getProduct(slug: string): Promise<Product | undefined> {
	const products = await getProducts();
	return products.find((product) => product.slug === slug);
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
	const products = await getProducts();
	return products
		.filter((product) => product.category === category)
		.sort((a, b) => Number(b.new) - Number(a.new) || b.ord - a.ord);
}

export async function createOrder(payload: OrderPayload): Promise<OrderConfirmation> {
	const response = await fetch('/Order/', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
		body: JSON.stringify(payload),
	});
	if (!response.ok) {
		const body = await response.text();
		throw new Error(body || `Order failed (${response.status})`);
	}
	return (await response.json()) as OrderConfirmation;
}
