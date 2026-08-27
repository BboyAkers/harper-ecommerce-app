import { cn } from '@/lib/utils.ts';
import { MAX_LINE_QUANTITY } from '@shared/cart.ts';

interface QuantitySelectorProps {
	value: number;
	onChange: (value: number) => void;
	/**
	 * Lowest reachable value. Defaults to 1 — but the cart passes 0 deliberately,
	 * because decrementing off the bottom is how a line is removed there.
	 */
	min?: number;
	/** Highest reachable value; pass `maxOrderable(product)` to bound by stock. */
	max?: number;
	size?: 'default' | 'small';
	className?: string;
}

export function QuantitySelector({
	value,
	onChange,
	min = 1,
	max = MAX_LINE_QUANTITY,
	size = 'default',
	className,
}: QuantitySelectorProps) {
	// Clamped here as well as gated on the buttons, so a caller that forgets to
	// pass `max` still cannot drive the value out of range.
	const step = (next: number) => onChange(Math.min(max, Math.max(min, next)));

	const button =
		'flex h-full w-1/3 cursor-pointer items-center justify-center opacity-25 transition-opacity hover:text-primary hover:opacity-100 disabled:pointer-events-none disabled:opacity-10';

	return (
		<div
			className={cn(
				'flex items-center bg-light text-[13px] font-bold tracking-[1px]',
				size === 'default' ? 'h-12 w-[120px]' : 'h-8 w-24',
				className,
			)}
		>
			<button
				type="button"
				aria-label="Decrease quantity"
				className={button}
				disabled={value <= min}
				onClick={() => step(value - 1)}
			>
				-
			</button>
			<span className="flex w-1/3 justify-center">{value}</span>
			<button
				type="button"
				aria-label="Increase quantity"
				className={button}
				disabled={value >= max}
				onClick={() => step(value + 1)}
			>
				+
			</button>
		</div>
	);
}
