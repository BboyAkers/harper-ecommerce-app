import { BestGear } from '@/components/best-gear.tsx';
import { CategoryLinks } from '@/components/category-links.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getProductsByCategory } from '@/lib/api.ts';
import type { Product } from '@/lib/types.ts';
import { cn } from '@/lib/utils.ts';
import { getRouteApi, Link } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

const route = getRouteApi('/category/$category');

export function CategoryPage() {
	const { category } = route.useParams();
	const [products, setProducts] = useState<Product[] | undefined>();
	const [error, setError] = useState<string | undefined>();

	useEffect(() => {
		setProducts(undefined);
		setError(undefined);
		getProductsByCategory(category)
			.then(setProducts)
			.catch((err: Error) => setError(err.message));
	}, [category]);

	return (
		<>
			<section className="bg-dark text-white">
				<div className="container-app flex items-center justify-center py-8 sm:py-[97px]">
					<h1 className="text-[28px] font-bold uppercase tracking-[2px] sm:text-[40px] sm:leading-[44px] sm:tracking-[1.43px]">
						{category}
					</h1>
				</div>
			</section>

			<div className="container-app mt-16 space-y-[120px] sm:mt-[120px] lg:mt-40 lg:space-y-40">
				{error && <p className="text-body text-error">{error}</p>}
				{products?.length === 0 && <p className="text-body opacity-50">No products found in this category.</p>}
				{products?.map((product, index) => (
					<article
						key={product.slug}
						className="grid items-center gap-8 sm:gap-[52px] lg:grid-cols-2 lg:gap-[125px]"
					>
						<picture className={cn('overflow-hidden rounded-lg', index % 2 === 1 && 'lg:order-last')}>
							<source media="(min-width: 1024px)" srcSet={product.categoryImage.desktop} />
							<source media="(min-width: 640px)" srcSet={product.categoryImage.tablet} />
							<img src={product.categoryImage.mobile} alt={product.name} className="w-full" />
						</picture>
						<div className="mx-auto max-w-[573px] text-center lg:max-w-[445px] lg:text-left">
							{product.new && <p className="text-overline">New product</p>}
							<h2 className="mt-6 text-[28px] font-bold uppercase leading-[38px] tracking-[1px] sm:text-[40px] sm:leading-[44px] sm:tracking-[1.43px]">
								{product.name}
							</h2>
							<p className="text-body mt-6 opacity-50 lg:mt-8">{product.description}</p>
							<Button asChild className="mt-6 lg:mt-10">
								<Link to="/product/$slug" params={{ slug: product.slug }}>
									See Product
								</Link>
							</Button>
						</div>
					</article>
				))}
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
