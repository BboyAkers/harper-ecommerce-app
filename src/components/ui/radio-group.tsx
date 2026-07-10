import { cn } from '@/lib/utils.ts';
import * as RadioGroupPrimitive from '@radix-ui/react-radio-group';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

export const RadioGroup = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Root>>(
	({ className, ...props }, ref) => (
		<RadioGroupPrimitive.Root ref={ref} className={cn('grid gap-4', className)} {...props} />
	),
);
RadioGroup.displayName = 'RadioGroup';

export const RadioGroupItem = forwardRef<
	HTMLButtonElement,
	ComponentPropsWithoutRef<typeof RadioGroupPrimitive.Item>
>(({ className, ...props }, ref) => (
	<RadioGroupPrimitive.Item
		ref={ref}
		className={cn(
			'flex size-5 shrink-0 items-center justify-center rounded-full border border-input-border bg-white outline-none focus-visible:border-primary',
			className,
		)}
		{...props}
	>
		<RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
	</RadioGroupPrimitive.Item>
));
RadioGroupItem.displayName = 'RadioGroupItem';
