import { cn } from '@/lib/utils.ts';
import { forwardRef, type InputHTMLAttributes } from 'react';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { error?: boolean }>(
	({ className, error, ...props }, ref) => (
		<input
			ref={ref}
			className={cn(
				'h-14 w-full rounded-lg border border-input-border bg-white px-6 text-sm font-bold tracking-[-0.25px] text-black caret-primary outline-none placeholder:opacity-40 focus:border-primary',
				error && 'border-2 border-error',
				className,
			)}
			{...props}
		/>
	),
);
Input.displayName = 'Input';
