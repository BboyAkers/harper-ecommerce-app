import { BestGear } from '@/components/best-gear.tsx';
import { CategoryLinks } from '@/components/category-links.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getProducts } from '@/lib/api.ts';
import type { Product } from '@/lib/types.ts';
import { formatPrice } from '@/lib/utils.ts';
import { Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export function AllProductsPage() {
	const [products, setProducts] = useState<Product[] | undefined>();
	const [error, setError] = useState<string | undefined>();

	useEffect(() => {
		getProducts()
			.then(setProducts)
			.catch((err: Error) => setError(err.message));
	}, []);

	return (
		<>
			<section className="bg-dark text-white">
				<div className="container-app flex flex-col items-center gap-4 py-8 text-center sm:py-[97px]">
					<h1 className="text-[28px] font-bold uppercase tracking-[2px] sm:text-[40px] sm:leading-[44px] sm:tracking-[1.43px]">
						All Products
					</h1>
					<p className="text-body max-w-[35ch] opacity-75">Browse the full Audiophile range.</p>
				</div>
			</section>

			<div className="container-app mt-16 sm:mt-[120px] lg:mt-40">
				{error && <p className="text-body text-error">{error}</p>}
				{products?.length === 0 && <p className="text-body opacity-50">No products available.</p>}

				<ul className="space-y-6 lg:space-y-8">
					{products?.map((product) => (
						<li key={product.slug}>
							<article className="flex flex-col overflow-hidden rounded-lg bg-light sm:flex-row sm:items-center">
								<picture className="sm:w-[40%] sm:max-w-[320px] sm:shrink-0">
									<source media="(min-width: 1024px)" srcSet={product.categoryImage.desktop} />
									<source media="(min-width: 640px)" srcSet={product.categoryImage.tablet} />
									<img
										src={product.categoryImage.mobile}
										alt={product.name}
										className="h-56 w-full object-cover sm:h-full"
									/>
								</picture>
								<div className="flex flex-1 flex-col items-start gap-4 p-6 sm:p-8 lg:p-12">
									<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
										{product.new && <span className="text-overline text-[13px] tracking-[8px]">New product</span>}
										<span className="text-subtitle opacity-50">{product.category}</span>
									</div>
									<h2 className="text-2xl font-bold uppercase tracking-[1px] sm:text-[28px] sm:leading-[32px] sm:tracking-[2px]">
										{product.name}
									</h2>
									<p className="text-body line-clamp-3 opacity-50">{product.description}</p>
									<div className="mt-2 flex w-full flex-wrap items-center justify-between gap-4">
										<span className="text-lg font-bold tracking-[1.29px]">{formatPrice(product.price)}</span>
										<Button asChild>
											<Link to="/product/$slug" params={{ slug: product.slug }}>
												See Product
											</Link>
										</Button>
									</div>
								</div>
							</article>
						</li>
					))}
				</ul>
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
