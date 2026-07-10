import { cn } from '@/lib/utils.ts';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { type ComponentPropsWithoutRef, forwardRef } from 'react';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;

export const DialogOverlay = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
	({ className, ...props }, ref) => (
		<DialogPrimitive.Overlay
			ref={ref}
			className={cn('fixed inset-0 z-40 bg-black/40', className)}
			{...props}
		/>
	),
);
DialogOverlay.displayName = 'DialogOverlay';

/**
 * Unstyled positioned content: each usage supplies its own placement classes
 * (the cart panel sits under the header; the confirmation modal is centered).
 */
export const DialogContent = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<typeof DialogPrimitive.Content>>(
	({ className, children, ...props }, ref) => (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Content
				ref={ref}
				className={cn('fixed z-50 rounded-lg bg-white outline-none', className)}
				{...props}
			>
				{children}
			</DialogPrimitive.Content>
		</DialogPortal>
	),
);
DialogContent.displayName = 'DialogContent';
