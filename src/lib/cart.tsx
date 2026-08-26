import { mergeCart, saveCart } from '@/lib/api.ts';
import { useAuth } from '@/lib/auth.tsx';
import { useProducts } from '@/lib/queries.ts';
import type { CartItem, Product } from '@/lib/types.ts';
import { type CartAdjustment, type CartLine, isValidLine, MAX_LINE_QUANTITY } from '@shared/cart.ts';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * The cart, backed by Harper for signed-in customers and by localStorage for guests.
 *
 * Canonical state is a list of `{ slug, quantity }` — the same shape the server
 * stores. Display fields (name, price, image) are joined in from the catalog on
 * render rather than persisted, so a cart can never quote a stale price. That
 * costs a little: the badge stays empty until the products query resolves. It is
 * a shared, cached query that most pages already issue, and the alternative is a
 * cart that disagrees with the checkout total.
 *
 * The public API is unchanged from the localStorage-only version, so no consumer
 * component knows any of this happened.
 */

const STORAGE_KEY = 'audiophile-cart';

interface CartContextValue {
	items: CartItem[];
	totalQuantity: number;
	total: number;
	/** Lines the server reduced because stock moved; empty most of the time. */
	adjustments: CartAdjustment[];
	dismissAdjustments: () => void;
	addItem: (product: Product, quantity: number) => void;
	setQuantity: (slug: string, quantity: number) => void;
	removeAll: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

/**
 * Read the guest cart.
 *
 * Tolerates the older format, which stored the display fields inline: the extra
 * keys are simply dropped, so an existing shopper's cart survives the upgrade.
 */
function loadGuestLines(): CartLine[] {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed
			.map((entry) => ({ slug: (entry as CartLine)?.slug, quantity: Number((entry as CartLine)?.quantity) }))
			.filter(isValidLine);
	} catch {
		return [];
	}
}

export function CartProvider({ children }: { children: ReactNode }) {
	const { user } = useAuth();
	const { data: products } = useProducts();
	const username = user?.username;

	const [lines, setLines] = useState<CartLine[]>(loadGuestLines);
	const [adjustments, setAdjustments] = useState<CartAdjustment[]>([]);

	// Mutators read through this so they never close over a stale array.
	const linesRef = useRef(lines);
	linesRef.current = lines;

	// Guests persist locally; a signed-in cart lives on the server instead.
	useEffect(() => {
		if (username) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
	}, [lines, username]);

	// Adopt the account's cart once per sign-in, merging in whatever the guest
	// had. Posting an empty list on a plain reload is a no-op merge that returns
	// the stored cart, so this one path covers both cases.
	const adoptedFor = useRef<string | undefined>(undefined);
	useEffect(() => {
		if (!username) {
			adoptedFor.current = undefined;
			setLines(loadGuestLines());
			return;
		}
		if (adoptedFor.current === username) return;
		adoptedFor.current = username;

		let cancelled = false;
		void mergeCart(username, loadGuestLines()).then(
			(result) => {
				if (cancelled) return;
				setLines(result.items);
				setAdjustments(result.adjustments);
				// The guest copy has been absorbed; leaving it would resurrect
				// removed items on the next sign-in.
				localStorage.removeItem(STORAGE_KEY);
			},
			() => {
				// The saved cart is a convenience, not a gate. If it cannot be
				// reached, keep shopping with what is in hand.
				if (!cancelled) adoptedFor.current = undefined;
			},
		);
		return () => {
			cancelled = true;
		};
	}, [username]);

	/** Apply a change locally, then let the server have the last word on stock. */
	const commit = useCallback(
		(next: CartLine[]) => {
			setLines(next);
			if (!username) return;
			void saveCart(username, next).then(
				(result) => {
					setLines(result.items);
					setAdjustments(result.adjustments);
				},
				() => {
					// Keep the optimistic state; the next write reconciles it.
				},
			);
		},
		[username],
	);

	const addItem = useCallback(
		(product: Product, quantity: number) => {
			const current = linesRef.current;
			const existing = current.find((line) => line.slug === product.slug);
			commit(
				existing
					? current.map((line) =>
							line.slug === product.slug
								? { ...line, quantity: Math.min(MAX_LINE_QUANTITY, line.quantity + quantity) }
								: line,
						)
					: [...current, { slug: product.slug, quantity: Math.min(MAX_LINE_QUANTITY, quantity) }],
			);
		},
		[commit],
	);

	const setQuantity = useCallback(
		(slug: string, quantity: number) => {
			const current = linesRef.current;
			commit(
				quantity < 1
					? current.filter((line) => line.slug !== slug)
					: current.map((line) =>
							line.slug === slug ? { ...line, quantity: Math.min(MAX_LINE_QUANTITY, quantity) } : line,
						),
			);
		},
		[commit],
	);

	const removeAll = useCallback(() => commit([]), [commit]);
	const dismissAdjustments = useCallback(() => setAdjustments([]), []);

	const value = useMemo<CartContextValue>(() => {
		const bySlug = new Map((products ?? []).map((product) => [product.slug, product]));
		// A line whose product has left the catalog simply stops rendering.
		const items = lines.flatMap<CartItem>((line) => {
			const product = bySlug.get(line.slug);
			if (!product) return [];
			return [
				{
					slug: product.slug,
					shortName: product.shortName,
					price: product.price,
					image: `/assets/cart/image-${product.slug}.jpg`,
					quantity: line.quantity,
				},
			];
		});

		return {
			items,
			total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
			totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
			adjustments,
			dismissAdjustments,
			addItem,
			setQuantity,
			removeAll,
		};
	}, [lines, products, adjustments, dismissAdjustments, addItem, setQuantity, removeAll]);

	return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
	const context = useContext(CartContext);
	if (!context) throw new Error('useCart must be used within CartProvider');
	return context;
}
