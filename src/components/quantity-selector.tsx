import { cn } from '@/lib/utils.ts';

interface QuantitySelectorProps {
	value: number;
	onChange: (value: number) => void;
	size?: 'default' | 'small';
	className?: string;
}

export function QuantitySelector({ value, onChange, size = 'default', className }: QuantitySelectorProps) {
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
				className="flex h-full w-1/3 cursor-pointer items-center justify-center opacity-25 transition-opacity hover:text-primary hover:opacity-100"
				onClick={() => onChange(value - 1)}
			>
				-
			</button>
			<span className="flex w-1/3 justify-center">{value}</span>
			<button
				type="button"
				aria-label="Increase quantity"
				className="flex h-full w-1/3 cursor-pointer items-center justify-center opacity-25 transition-opacity hover:text-primary hover:opacity-100"
				onClick={() => onChange(value + 1)}
			>
				+
			</button>
		</div>
	);
}
