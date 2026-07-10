import { cn } from '@/lib/utils.ts';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { type ButtonHTMLAttributes, forwardRef } from 'react';

const buttonVariants = cva(
	'inline-flex h-12 cursor-pointer items-center justify-center px-8 text-[13px] font-bold uppercase tracking-[1px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50',
	{
		variants: {
			variant: {
				default: 'bg-primary text-white hover:bg-primary-light',
				secondary: 'border border-black bg-transparent text-black hover:bg-black hover:text-white',
				dark: 'bg-black text-white hover:bg-[#4c4c4c]',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return <Comp className={cn(buttonVariants({ variant }), className)} ref={ref} {...props} />;
	},
);
Button.displayName = 'Button';

export { buttonVariants };
