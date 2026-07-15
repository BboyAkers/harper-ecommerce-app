import { createOrder, fetchProducts } from '@/lib/api.ts';
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
