import { cn } from '@/lib/utils.ts';
import { type StockLevel, stockLabel, stockState } from '@shared/inventory.ts';

/**
 * Inventory state, rendered from the same rules the server enforces.
 *
 * The copy and the classification both come from `shared/inventory.ts`, which
 * `resources/Order.ts` and `resources/Cart.ts` also use — so a product the
 * server will refuse to sell is a product this badge already called sold out.
 *
 * Renders nothing for an untracked or well-stocked product: a badge on every
 * tile is noise, and "In stock" is not information a shopper needs.
 */
export function StockBadge({ product, className }: { product: StockLevel; className?: string }) {
	const label = stockLabel(product);
	if (!label) return null;

	const soldOut = stockState(product) === 'sold-out';
	return (
		<span
			className={cn(
				'text-[13px] font-bold uppercase tracking-[1px]',
				soldOut ? 'text-error' : 'text-primary',
				className,
			)}
		>
			{label}
		</span>
	);
}
