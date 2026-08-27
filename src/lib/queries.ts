import { createOrder, fetchMyOrders, fetchProducts } from '@/lib/api.ts';
import type { Product } from '@/lib/types.ts';
import { queryOptions, useMutation, useQuery } from '@tanstack/react-query';

// A single cached catalog request backs every product view; the derived hooks
// below share it and just apply a `select` transform, so there's one network call.
export const productsQueryOptions = queryOptions({
	queryKey: ['products'],
	queryFn: fetchProducts,
});

export function useProducts() {
	return useQuery(productsQueryOptions);
}

export function useProduct(slug: string) {
	return useQuery({
		...productsQueryOptions,
		select: (products: Product[]) => products.find((product) => product.slug === slug),
	});
}

export function useProductsByCategory(category: string) {
	return useQuery({
		...productsQueryOptions,
		select: (products: Product[]) =>
			products
				.filter((product) => product.category === category)
				.sort((a, b) => Number(b.new) - Number(a.new) || b.ord - a.ord),
	});
}

export function useCreateOrder() {
	return useMutation({ mutationFn: createOrder });
}

/**
 * The signed-in customer's order history.
 *
 * Scoping happens in `resources/Order.ts`, so this asks for nothing
 * user-specific and the key carries no username — signing out clears the cache
 * (see `src/lib/auth.tsx`) rather than keying around it.
 */
export const ordersQueryOptions = queryOptions({
	queryKey: ['orders'],
	queryFn: fetchMyOrders,
	retry: false,
});

export function useMyOrders(enabled: boolean) {
	return useQuery({ ...ordersQueryOptions, enabled });
}
