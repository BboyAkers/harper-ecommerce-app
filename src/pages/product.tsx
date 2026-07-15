import { BestGear } from '@/components/best-gear.tsx';
import { CategoryLinks } from '@/components/category-links.tsx';
import { QuantitySelector } from '@/components/quantity-selector.tsx';
import { Button } from '@/components/ui/button.tsx';
import { useCart } from '@/lib/cart.tsx';
import { useProduct } from '@/lib/queries.ts';
import { formatPrice } from '@/lib/utils.ts';
import { getRouteApi, Link, useRouter } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

const route = getRouteApi('/product/$slug');

export function ProductPage() {
	const { slug } = route.useParams();
	const router = useRouter();
	const { addItem } = useCart();
	const { data: product, isSuccess } = useProduct(slug);
	const [quantity, setQuantity] = useState(1);

	// Reset quantity when navigating between product pages (same component, new slug).
	useEffect(() => setQuantity(1), [slug]);

	// The query resolved but no product matched this slug.
	if (isSuccess && !product) {
		return (
			<div className="container-app py-24">
				<p className="text-body opacity-50">Product not found.</p>
			</div>
		);
	}

	if (!product) return <div className="min-h-[60vh]" />;

	return (
		<>
			<div className="container-app pt-4 sm:pt-8 lg:pt-20">
				<button
					type="button"
					onClick={() => router.history.back()}
					className="text-body cursor-pointer opacity-50 transition hover:text-primary hover:opacity-100"
				>
					Go Back
				</button>

				{/* Product overview */}
				<section className="mt-6 grid items-center gap-8 sm:grid-cols-2 sm:gap-[69px] lg:gap-[125px]">
					<picture className="overflow-hidden rounded-lg">
						<source media="(min-width: 1024px)" srcSet={product.image.desktop} />
						<source media="(min-width: 640px)" srcSet={product.image.tablet} />
						<img src={product.image.mobile} alt={product.name} className="w-full" />
					</picture>
					<div className="max-w-[445px]">
						{product.new && <p className="text-overline">New product</p>}
						<h1 className="mt-4 text-[28px] font-bold uppercase leading-8 tracking-[1px] sm:tracking-[1.43px] lg:mt-6 lg:text-[40px] lg:leading-[44px]">
							{product.name}
						</h1>
						<p className="text-body mt-6 opacity-50 lg:mt-8">{product.description}</p>
						<p className="mt-6 text-lg font-bold tracking-[1.29px] lg:mt-8">{formatPrice(product.price)}</p>
						<div className="mt-8 flex items-center gap-4 lg:mt-[47px]">
							<QuantitySelector value={quantity} onChange={(next) => setQuantity(Math.max(1, next))} />
							<Button onClick={() => addItem(product, quantity)}>Add to Cart</Button>
						</div>
					</div>
				</section>

				{/* Features + in the box */}
				<section className="mt-[88px] grid gap-[88px] sm:mt-[120px] sm:gap-[120px] lg:mt-40 lg:grid-cols-[635px_1fr] lg:gap-[125px]">
					<div>
						<h2 className="text-2xl font-bold uppercase tracking-[0.86px] sm:text-[32px] sm:leading-9 sm:tracking-[1.14px]">
							Features
						</h2>
						<div className="text-body mt-6 space-y-6 opacity-50 sm:mt-8">
							{product.features.split('\n\n').map((paragraph, index) => (
								<p key={index}>{paragraph}</p>
							))}
						</div>
					</div>
					<div className="grid gap-6 sm:grid-cols-2 sm:gap-0 lg:grid-cols-1 lg:content-start lg:gap-8">
						<h2 className="text-2xl font-bold uppercase tracking-[0.86px] sm:text-[32px] sm:leading-9 sm:tracking-[1.14px]">
							In the Box
						</h2>
						<ul className="space-y-2">
							{product.includes.map((entry, index) => (
								<li key={index} className="text-body flex gap-6">
									<span className="w-6 font-bold text-primary">{entry.quantity}x</span>
									<span className="opacity-50">{entry.item}</span>
								</li>
							))}
						</ul>
					</div>
				</section>

				{/* Gallery */}
				<section className="mt-[88px] grid gap-5 sm:mt-[120px] sm:grid-cols-[40%_1fr] sm:gap-[18px] lg:mt-40 lg:gap-[30px]">
					<div className="grid gap-5 sm:gap-[18px] lg:gap-8">
						{[product.gallery.first, product.gallery.second].map((image, index) => (
							<picture key={index} className="overflow-hidden rounded-lg">
								<source media="(min-width: 1024px)" srcSet={image.desktop} />
								<source media="(min-width: 640px)" srcSet={image.tablet} />
								<img src={image.mobile} alt="" className="size-full object-cover" />
							</picture>
						))}
					</div>
					<picture className="overflow-hidden rounded-lg">
						<source media="(min-width: 1024px)" srcSet={product.gallery.third.desktop} />
						<source media="(min-width: 640px)" srcSet={product.gallery.third.tablet} />
						<img src={product.gallery.third.mobile} alt="" className="size-full object-cover" />
					</picture>
				</section>

				{/* You may also like */}
				<section className="mt-[120px] lg:mt-40">
					<h2 className="text-center text-2xl font-bold uppercase tracking-[0.86px] sm:text-[32px] sm:leading-9 sm:tracking-[1.14px]">
						You may also like
					</h2>
					<div className="mt-10 grid gap-14 sm:grid-cols-3 sm:gap-[11px] sm:gap-y-14 lg:mt-16 lg:gap-[30px]">
						{product.others.map((other) => (
							<div key={other.slug} className="text-center">
								<picture className="block overflow-hidden rounded-lg bg-light">
									<source media="(min-width: 1024px)" srcSet={other.image.desktop} />
									<source media="(min-width: 640px)" srcSet={other.image.tablet} />
									<img src={other.image.mobile} alt={other.name} className="w-full" />
								</picture>
								<h3 className="mt-8 text-2xl font-bold uppercase tracking-[1.71px] lg:mt-10">{other.shortName}</h3>
								<Button asChild className="mt-8">
									<Link to="/product/$slug" params={{ slug: other.slug }}>
										See Product
									</Link>
								</Button>
							</div>
						))}
					</div>
				</section>
			</div>

			<div className="container-app mt-[120px] lg:mt-40">
				<CategoryLinks />
			</div>
			<div className="mt-[120px] lg:mt-40">
				<BestGear />
			</div>
		</>
	);
}
