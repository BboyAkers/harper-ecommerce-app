import type { OrderConfirmation, OrderPayload, Product } from '@/lib/types.ts';

// Low-level fetchers. Caching/dedup/state is handled by React Query (see queries.ts);
// these just talk to Harper's REST API and throw on failure.

export async function fetchProducts(): Promise<Product[]> {
	// Accept must be JSON-specific: the Vite dev middleware serves the SPA
	// index.html fallback for requests that accept */*.
	const response = await fetch('/Product/?limit(100)', { headers: { Accept: 'application/json' } });
	if (!response.ok) throw new Error(`Failed to load products (${response.status})`);
	const products = (await response.json()) as Product[];
	return products.sort((a, b) => a.ord - b.ord);
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
