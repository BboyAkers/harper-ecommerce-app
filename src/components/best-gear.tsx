export function BestGear() {
	return (
		<section className="container-app grid items-center gap-10 lg:grid-cols-2 lg:gap-[125px]">
			<picture className="order-first overflow-hidden rounded-lg lg:order-last">
				<source media="(min-width: 1024px)" srcSet="/assets/shared/desktop/image-best-gear.jpg" />
				<source media="(min-width: 640px)" srcSet="/assets/shared/tablet/image-best-gear.jpg" />
				<img src="/assets/shared/mobile/image-best-gear.jpg" alt="Man listening to headphones" className="w-full" />
			</picture>
			<div className="mx-auto max-w-[573px] text-center lg:max-w-[445px] lg:text-left">
				<h2 className="text-[28px] font-bold uppercase leading-[38px] tracking-[1px] sm:text-[40px] sm:leading-[44px] sm:tracking-[1.43px]">
					Bringing you the <span className="text-primary">best</span> audio gear
				</h2>
				<p className="text-body mt-8 opacity-50">
					Located at the heart of New York City, Audiophile is the premier store for high end headphones, earphones,
					speakers, and audio accessories. We have a large showroom and luxury demonstration rooms available for you to
					browse and experience a wide range of our products. Stop by our store to meet some of the fantastic people
					who make Audiophile the best place to buy your portable audio equipment.
				</p>
			</div>
		</section>
	);
}
