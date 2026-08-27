import { QuantitySelector } from '@/components/quantity-selector.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { type CartAdjustmentView, useCart } from '@/lib/cart.tsx';
import { formatPrice } from '@/lib/utils.ts';
import { maxOrderable } from '@shared/inventory.ts';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

/** What a stock adjustment reads like to the customer it happened to. */
function describe(adjustment: CartAdjustmentView): string {
	const { shortName, requested, available } = adjustment;
	return available === 0
		? `“${shortName}” sold out, so we removed it from your cart.`
		: `Only ${available} of “${shortName}” left — we reduced your quantity from ${requested}.`;
}

export function CartDialog() {
	const { items, total, totalQuantity, adjustments, dismissAdjustments, setQuantity, removeAll } = useCart();
	const [open, setOpen] = useState(false);
	const navigate = useNavigate();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button type="button" aria-label="Cart" className="relative cursor-pointer">
					<img src="/assets/shared/desktop/icon-cart.svg" alt="" className="h-5 w-[23px]" />
					{totalQuantity > 0 && (
						<span className="absolute -right-3 -top-3 flex size-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
							{totalQuantity}
						</span>
					)}
				</button>
			</DialogTrigger>
			<DialogContent
				aria-describedby={undefined}
				className="left-1/2 top-[114px] max-h-[calc(100vh-140px)] w-[calc(100vw-48px)] max-w-[377px] -translate-x-1/2 overflow-y-auto p-7 sm:p-8 lg:left-auto lg:right-[max(24px,calc((100vw-1110px)/2))] lg:translate-x-0"
			>
				{/* The header renders in both states so the title is always present for
				    Radix, and so an emptied cart still reads "Cart (0)". */}
				<div className="flex items-center justify-between">
					<DialogTitle className="text-lg font-bold uppercase tracking-[1.29px]">
						{/* Units, matching the badge — these used to disagree whenever a line held more than one. */}
						Cart ({totalQuantity})
					</DialogTitle>
					{items.length > 0 && (
						<button
							type="button"
							onClick={removeAll}
							className="text-body cursor-pointer underline opacity-50 transition hover:text-primary hover:opacity-100"
						>
							Remove all
						</button>
					)}
				</div>
				<DialogDescription className="sr-only">Items currently in your cart</DialogDescription>

				{/*
				 * Deliberately outside the empty/non-empty split below. `clampToStock`
				 * removes a sold-out line entirely, so a cart holding only that line
				 * ends up empty — and while this banner lived inside the non-empty
				 * branch, the customer got "Your cart is empty" and no explanation at
				 * all for where their item went.
				 */}
				{adjustments.length > 0 && (
					<div className="mt-6 rounded-lg bg-light p-4">
						<p className="text-body font-bold text-error">Stock changed while you were shopping</p>
						<ul className="text-body mt-2 space-y-1 opacity-75">
							{adjustments.map((adjustment) => (
								<li key={adjustment.slug}>{describe(adjustment)}</li>
							))}
						</ul>
						<button
							type="button"
							onClick={dismissAdjustments}
							className="text-body mt-3 cursor-pointer underline opacity-50 transition hover:opacity-100"
						>
							Got it
						</button>
					</div>
				)}

				{items.length === 0 ? (
					<p className="text-body mt-8 opacity-50">Your cart is empty.</p>
				) : (
					<>
						<ul className="mt-8 space-y-6">
							{items.map((item) => (
								<li key={item.slug} className="flex items-center gap-4">
									<img src={item.image} alt={item.shortName} className="size-16 rounded-lg" />
									<div className="min-w-0 flex-1">
										<p className="truncate text-[15px] font-bold">{item.shortName}</p>
										<p className="text-sm font-bold opacity-50">{formatPrice(item.price)}</p>
									</div>
									<QuantitySelector
										size="small"
										value={item.quantity}
										// min 0: decrementing off the bottom is how a line is removed
										// here, which `setQuantity` handles. max bounds it by stock.
										min={0}
										max={maxOrderable(item)}
										onChange={(quantity) => setQuantity(item.slug, quantity)}
									/>
								</li>
							))}
						</ul>
						<div className="mt-8 flex items-center justify-between">
							<span className="text-body uppercase opacity-50">Total</span>
							<span className="text-lg font-bold">{formatPrice(total)}</span>
						</div>
						<Button
							className="mt-6 w-full"
							onClick={() => {
								setOpen(false);
								navigate({ to: '/checkout' });
							}}
						>
							Checkout
						</Button>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
}
