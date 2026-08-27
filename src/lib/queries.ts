import {
	createOrder,
	createProduct,
	deleteProduct,
	fetchMyOrders,
	fetchProducts,
	type ProductDraft,
	updateProduct,
} from '@/lib/api.ts';
import type { Product } from '@/lib/types.ts';
import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

/**
 * A single product by primary key, for the catalog editor.
 *
 * Keyed on `id` rather than `slug` because the editor can change the slug —
 * routing the form on a value it is editing would navigate out from under
 * itself on the first keystroke.
 */
export function useProductById(id: string) {
	return useQuery({
		...productsQueryOptions,
		select: (products: Product[]) => products.find((product) => product.id === id),
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

/**
 * Catalog mutations, for the `editor` role's authoring UI.
 *
 * Each one invalidates the single `['products']` query the entire storefront
 * reads from, so a saved edit reaches the category grids, the product page and
 * the cart's stock bounds without any of them knowing the editor exists.
 *
 * None of them writes an optimistic cache entry. Harper assigns the id on
 * create and the server is the authority on what a record ends up holding, so
 * a refetch is both simpler and the only version worth showing.
 */
function useCatalogMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<void>) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: productsQueryOptions.queryKey }),
	});
}

export function useCreateProduct() {
	return useCatalogMutation(createProduct);
}

export function useUpdateProduct() {
	return useCatalogMutation(({ id, changes }: { id: string; changes: Partial<ProductDraft> }) =>
		updateProduct(id, changes),
	);
}

export function useDeleteProduct() {
	return useCatalogMutation(deleteProduct);
}
