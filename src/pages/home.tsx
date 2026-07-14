import { BestGear } from '@/components/best-gear.tsx';
import { CategoryLinks } from '@/components/category-links.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Link } from '@tanstack/react-router';

export function HomePage() {
	return (
		<>
			{/* Hero */}
			<section className="relative -mt-[90px] overflow-hidden bg-charcoal pt-[90px] text-white lg:-mt-24 lg:pt-24">
				<picture>
					<source media="(min-width: 1024px)" srcSet="/assets/home/desktop/image-hero.jpg" />
					<source media="(min-width: 640px)" srcSet="/assets/home/tablet/image-header.jpg" />
					<img
						src="/assets/home/mobile/image-header.jpg"
						alt=""
						className="absolute inset-0 size-full object-cover object-center"
					/>
				</picture>
				<div className="container-app relative flex min-h-[510px] items-center justify-center py-24 text-center lg:min-h-[632px] lg:justify-start lg:text-left">
					<div className="max-w-[398px]">
						<p className="text-overline text-white/50">New product</p>
						<h1 className="mt-4 text-4xl font-bold uppercase leading-[40px] tracking-[1.29px] sm:text-[56px] sm:leading-[58px] sm:tracking-[2px] lg:mt-6">
							XX99 Mark II Headphones
						</h1>
						<p className="text-body mx-auto mt-6 max-w-[350px] text-white/75 lg:mx-0">
							Experience natural, lifelike audio and exceptional build quality made for the passionate music
							enthusiast.
						</p>
						<Button asChild className="mt-7 lg:mt-10">
							<Link to="/product/$slug" params={{ slug: 'xx99-mark-two-headphones' }}>
								See Product
							</Link>
						</Button>
					</div>
				</div>
			</section>

			<div className="container-app mt-[92px] sm:mt-[148px] lg:mt-[200px]">
				<CategoryLinks />
			</div>

			{/* ZX9 speaker feature */}
			<section className="container-app mt-[120px] lg:mt-[168px]">
				<div className="relative overflow-hidden rounded-lg bg-primary px-6 pb-14 pt-14 text-center text-white sm:pb-16 sm:pt-[52px] lg:pb-0 lg:pt-0 lg:text-left">
					<img
						src="/assets/home/desktop/pattern-circles.svg"
						alt=""
						className="pointer-events-none absolute -top-[120px] left-1/2 w-[558px] max-w-none -translate-x-1/2 sm:-top-[220px] sm:w-[944px] lg:-left-[150px] lg:-top-9 lg:translate-x-0"
					/>
					<div className="relative flex flex-col items-center gap-8 lg:grid lg:grid-cols-2 lg:items-end">
						<picture className="lg:translate-y-3 lg:pl-[112px]">
							<source media="(min-width: 1024px)" srcSet="/assets/home/desktop/image-speaker-zx9.png" />
							<source media="(min-width: 640px)" srcSet="/assets/home/tablet/image-speaker-zx9.png" />
							<img
								src="/assets/home/mobile/image-speaker-zx9.png"
								alt="ZX9 speaker"
								className="w-[172px] sm:w-[197px] lg:w-[410px]"
							/>
						</picture>
						<div className="max-w-[349px] lg:pb-[124px] lg:pt-[133px]">
							<h2 className="text-4xl font-bold uppercase leading-10 tracking-[1.29px] sm:text-[56px] sm:leading-[58px] sm:tracking-[2px]">
								ZX9 Speaker
							</h2>
							<p className="text-body mt-6 text-white/75">
								Upgrade to premium speakers that are phenomenally built to deliver truly remarkable sound.
							</p>
							<Button asChild variant="dark" className="mt-6 lg:mt-10">
								<Link to="/product/$slug" params={{ slug: 'zx9-speaker' }}>
									See Product
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* ZX7 speaker feature */}
			<section className="container-app mt-6 lg:mt-12">
				<div className="relative overflow-hidden rounded-lg">
					<picture>
						<source media="(min-width: 1024px)" srcSet="/assets/home/desktop/image-speaker-zx7.jpg" />
						<source media="(min-width: 640px)" srcSet="/assets/home/tablet/image-speaker-zx7.jpg" />
						<img src="/assets/home/mobile/image-speaker-zx7.jpg" alt="ZX7 speaker" className="h-80 w-full object-cover" />
					</picture>
					<div className="absolute inset-0 flex flex-col items-start justify-center px-6 sm:px-[62px] lg:px-[95px]">
						<h2 className="text-[28px] font-bold uppercase tracking-[2px]">ZX7 Speaker</h2>
						<Button asChild variant="secondary" className="mt-8">
							<Link to="/product/$slug" params={{ slug: 'zx7-speaker' }}>
								See Product
							</Link>
						</Button>
					</div>
				</div>
			</section>

			{/* YX1 earphones feature */}
			<section className="container-app mt-6 grid gap-6 sm:grid-cols-2 sm:gap-[11px] lg:mt-12 lg:gap-[30px]">
				<picture className="overflow-hidden rounded-lg">
					<source media="(min-width: 1024px)" srcSet="/assets/home/desktop/image-earphones-yx1.jpg" />
					<source media="(min-width: 640px)" srcSet="/assets/home/tablet/image-earphones-yx1.jpg" />
					<img
						src="/assets/home/mobile/image-earphones-yx1.jpg"
						alt="YX1 earphones"
						className="h-[200px] w-full object-cover sm:h-80"
					/>
				</picture>
				<div className="flex h-[200px] flex-col items-start justify-center rounded-lg bg-light px-6 sm:h-80 sm:px-10 lg:px-[95px]">
					<h2 className="text-[28px] font-bold uppercase tracking-[2px]">YX1 Earphones</h2>
					<Button asChild variant="secondary" className="mt-8">
						<Link to="/product/$slug" params={{ slug: 'yx1-earphones' }}>
							See Product
						</Link>
					</Button>
				</div>
			</section>

			<div className="mt-[120px] lg:mt-[200px]">
				<BestGear />
			</div>
		</>
	);
}
