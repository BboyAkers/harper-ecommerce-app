import { QuantitySelector } from '@/components/quantity-selector.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog.tsx';
import { useCart } from '@/lib/cart.tsx';
import { formatPrice } from '@/lib/utils.ts';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function CartDialog() {
	const { items, total, totalQuantity, setQuantity, removeAll } = useCart();
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
				{items.length === 0 ? (
					<>
						<DialogTitle className="text-lg font-bold uppercase tracking-[1.29px]">Cart (0)</DialogTitle>
						<p className="text-body mt-8 opacity-50">Your cart is empty.</p>
					</>
				) : (
					<>
						<div className="flex items-center justify-between">
							<DialogTitle className="text-lg font-bold uppercase tracking-[1.29px]">
								Cart ({items.length})
							</DialogTitle>
							<button
								type="button"
								onClick={removeAll}
								className="text-body cursor-pointer underline opacity-50 transition hover:text-primary hover:opacity-100"
							>
								Remove all
							</button>
						</div>
						<DialogDescription className="sr-only">Items currently in your cart</DialogDescription>
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
								navigate('/checkout');
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
