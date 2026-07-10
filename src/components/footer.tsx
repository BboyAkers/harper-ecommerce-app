import { NAV_LINKS } from '@/components/nav-links.ts';
import { Link } from 'react-router-dom';

const SOCIALS = [
	{ name: 'Facebook', icon: '/assets/shared/desktop/icon-facebook.svg', href: 'https://facebook.com' },
	{ name: 'Twitter', icon: '/assets/shared/desktop/icon-twitter.svg', href: 'https://twitter.com' },
	{ name: 'Instagram', icon: '/assets/shared/desktop/icon-instagram.svg', href: 'https://instagram.com' },
];

export function Footer() {
	return (
		<footer className="mt-[120px] bg-dark text-white lg:mt-[200px]">
			<div className="container-app relative flex flex-col items-center pb-[38px] text-center sm:items-start sm:text-left">
				<div className="absolute top-0 h-1 w-[101px] bg-primary" aria-hidden />
				<div className="flex w-full flex-col items-center gap-12 pt-[52px] sm:items-start sm:pt-[60px] lg:flex-row lg:items-center lg:justify-between lg:pt-[75px]">
					<Link to="/" aria-label="Audiophile home">
						<img src="/assets/shared/desktop/logo.svg" alt="audiophile" className="h-[25px] w-[143px]" />
					</Link>
					<nav className="flex flex-col items-center gap-4 sm:flex-row sm:gap-[34px]">
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
				</div>
				<p className="text-body mt-12 max-w-[540px] opacity-50">
					Audiophile is an all in one stop to fulfill your audio needs. We're a small team of music lovers and sound
					specialists who are devoted to helping you get the most out of personal audio. Come and visit our demo
					facility - we're open 7 days a week.
				</p>
				<div className="mt-12 flex w-full flex-col items-center gap-12 sm:flex-row sm:justify-between lg:mt-14">
					<p className="text-body font-bold opacity-50">Copyright 2021. All Rights Reserved</p>
					<div className="flex items-center gap-4 lg:absolute lg:bottom-[110px] lg:right-6">
						{SOCIALS.map((social) => (
							<a key={social.name} href={social.href} aria-label={social.name} target="_blank" rel="noreferrer">
								<img src={social.icon} alt="" className="size-6" />
							</a>
						))}
					</div>
				</div>
			</div>
		</footer>
	);
}
