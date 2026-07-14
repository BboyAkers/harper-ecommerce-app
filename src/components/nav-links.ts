import type { LinkProps } from '@tanstack/react-router';

export const NAV_LINKS: { label: string; linkProps: LinkProps }[] = [
	{ label: 'Home', linkProps: { to: '/' } },
	{ label: 'Headphones', linkProps: { to: '/category/$category', params: { category: 'headphones' } } },
	{ label: 'Speakers', linkProps: { to: '/category/$category', params: { category: 'speakers' } } },
	{ label: 'Earphones', linkProps: { to: '/category/$category', params: { category: 'earphones' } } },
];
