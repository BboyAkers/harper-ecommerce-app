import { cn } from '@/lib/utils.ts';
import { forwardRef, type SelectHTMLAttributes } from 'react';

/**
 * A native `<select>` wearing `Input`'s chrome.
 *
 * Radix's Select is not a dependency of this project, and the one place a
 * select appears — picking a product's category from three fixed values — is
 * exactly the case the platform control already handles well on every device.
 */
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }>(
	({ className, error, ...props }, ref) => (
		<select
			ref={ref}
			className={cn(
				'h-14 w-full cursor-pointer appearance-none rounded-lg border border-input-border bg-white px-6 text-sm font-bold tracking-[-0.25px] text-black outline-none focus:border-primary',
				error && 'border-2 border-error',
				className,
			)}
			{...props}
		/>
	),
);
Select.displayName = 'Select';
