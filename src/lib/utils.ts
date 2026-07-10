import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

const usd = new Intl.NumberFormat('en-US');

export function formatPrice(amount: number) {
	return `$ ${usd.format(Math.round(amount))}`;
}
