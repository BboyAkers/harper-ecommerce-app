import { CartDialog } from '@/components/cart-dialog.tsx';
import { CategoryLinks } from '@/components/category-links.tsx';
import { NAV_LINKS } from '@/components/nav-links.ts';
import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export function Header() {
	const [menuOpen, setMenuOpen] = useState(false);
	const location = useLocation();

	useEffect(() => {
		setMenuOpen(false);
	}, [location]);

	return (
		<header className="sticky top-0 z-30 bg-charcoal text-white">
			<div className="container-app relative flex h-[90px] items-center justify-between border-b border-white/10 lg:h-24">
				<button
					type="button"
					aria-label="Toggle menu"
					className="cursor-pointer lg:hidden"
					onClick={() => setMenuOpen((open) => !open)}
				>
					<svg width="16" height="15" viewBox="0 0 16 15" fill="none" xmlns="http://www.w3.org/2000/svg">
						<rect width="16" height="3" fill="currentColor" />
						<rect y="6" width="16" height="3" fill="currentColor" />
						<rect y="12" width="16" height="3" fill="currentColor" />
					</svg>
				</button>
				<Link to="/" aria-label="Audiophile home" className="sm:absolute sm:left-1/2 sm:-translate-x-1/2 lg:static lg:translate-x-0">
					<img src="/assets/shared/desktop/logo.svg" alt="audiophile" className="h-[25px] w-[143px]" />
				</Link>
				<nav className="hidden items-center gap-[34px] lg:flex">
					{NAV_LINKS.map((link) => (
						<Link
							key={link.href}
							to={link.href}
							className="text-subtitle tracking-[2px] transition-colors hover:text-primary"
						>
							{link.label}
						</Link>
					))}
				</nav>
				<CartDialog />
			</div>
			{menuOpen && (
				<>
					<div
						className="fixed inset-x-0 bottom-0 top-[90px] z-30 bg-black/40 lg:hidden"
						onClick={() => setMenuOpen(false)}
						aria-hidden
					/>
					<div className="absolute inset-x-0 z-40 max-h-[calc(100vh-90px)] overflow-y-auto rounded-b-lg bg-white px-6 pb-9 pt-8 text-black lg:hidden">
						<CategoryLinks onNavigate={() => setMenuOpen(false)} />
					</div>
				</>
			)}
		</header>
	);
}
