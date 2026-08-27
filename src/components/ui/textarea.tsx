import { cn } from '@/lib/utils.ts';
import { forwardRef, type TextareaHTMLAttributes } from 'react';

/**
 * Matches `Input`'s chrome, but sets body weight rather than bold: the fields
 * that need one hold paragraphs of catalog copy, and bold is unreadable at that
 * length.
 */
export const Textarea = forwardRef<
	HTMLTextAreaElement,
	TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ className, error, ...props }, ref) => (
	<textarea
		ref={ref}
		className={cn(
			'min-h-[140px] w-full rounded-lg border border-input-border bg-white px-6 py-4 text-[15px] font-medium leading-[25px] text-black caret-primary outline-none placeholder:opacity-40 focus:border-primary',
			error && 'border-2 border-error',
			className,
		)}
		{...props}
	/>
));
Textarea.displayName = 'Textarea';
