import { cn } from '@/lib/utils.ts';
import * as LabelPrimitive from '@radix-ui/react-label';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

export const Label = forwardRef<
	HTMLLabelElement,
	ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
	<LabelPrimitive.Root
		ref={ref}
		className={cn('text-xs font-bold tracking-[-0.21px] text-black', error && 'text-error', className)}
		{...props}
	/>
));
Label.displayName = 'Label';
