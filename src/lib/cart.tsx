import type { CartItem, Product } from '@/lib/types.ts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'audiophile-cart';

interface CartContextValue {
	items: CartItem[];
	totalQuantity: number;
	total: number;
	addItem: (product: Product, quantity: number) => void;
	setQuantity: (slug: string, quantity: number) => void;
	removeAll: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

function loadCart(): CartItem[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as CartItem[]) : [];
	} catch {
		return [];
	}
}

export function CartProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<CartItem[]>(loadCart);

	useEffect(() => {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
	}, [items]);

	const addItem = useCallback((product: Product, quantity: number) => {
		setItems((current) => {
			const existing = current.find((item) => item.slug === product.slug);
			if (existing) {
				return current.map((item) =>
					item.slug === product.slug ? { ...item, quantity: Math.min(99, item.quantity + quantity) } : item,
				);
			}
			return [
				...current,
				{
					slug: product.slug,
					shortName: product.shortName,
					price: product.price,
					image: `/assets/cart/image-${product.slug}.jpg`,
					quantity,
				},
			];
		});
	}, []);

	const setQuantity = useCallback((slug: string, quantity: number) => {
		setItems((current) =>
			quantity < 1
				? current.filter((item) => item.slug !== slug)
				: current.map((item) => (item.slug === slug ? { ...item, quantity: Math.min(99, quantity) } : item)),
		);
	}, []);

	const removeAll = useCallback(() => setItems([]), []);

	const value = useMemo<CartContextValue>(() => {
		const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
		const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
		return { items, total, totalQuantity, addItem, setQuantity, removeAll };
	}, [items, addItem, setQuantity, removeAll]);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const context = useContext(CartContext);
	if (!context) throw new Error('useCart must be used within CartProvider');
	return context;
}
