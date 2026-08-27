import { RequireEditor } from '@/components/require-editor.tsx';
import { StockBadge } from '@/components/stock-badge.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { useProducts } from '@/lib/queries.ts';
import type { Product } from '@/lib/types.ts';
import { formatPrice } from '@/lib/utils.ts';
import { isTracked } from '@shared/inventory.ts';
import { Link } from '@tanstack/react-router';
import { useMemo, useState } from 'react';

/** Free-text match over the fields an editor would plausibly search by. */
function matches(product: Product, query: string): boolean {
	const needle = query.trim().toLowerCase();
	if (!needle) return true;
	return [product.name, product.shortName, product.slug, product.category].some((field) =>
		field?.toLowerCase().includes(needle),
	);
}

/**
 * Inventory, stated rather than badged.
 *
 * `StockBadge` deliberately says nothing about a healthy product — right for a
 * shopper, wrong here, where "how many are there" is the question being asked.
 * So the count is always shown and the badge is kept for the two states that
 * need attention.
 */
function StockCell({ product }: { product: Product }) {
	if (!isTracked(product)) return <p className="text-sm font-bold opacity-30">Untracked</p>;

	return (
		<div>
			<p className="text-sm font-bold">{product.stock} in stock</p>
			<StockBadge product={product} />
		</div>
	);
}

function ProductRow({ product }: { product: Product }) {
	return (
		<li className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-lg bg-white p-4 sm:flex-nowrap sm:p-6">
			<img
				src={product.categoryImage?.mobile ?? product.image?.mobile}
				alt=""
				className="size-16 shrink-0 rounded-lg bg-light object-cover"
			/>

			<div className="min-w-0 flex-1 basis-full sm:basis-auto">
				<p className="truncate text-[15px] font-bold">{product.name}</p>
				{/* The slug is the public URL and the key every order line stores, so
				    it earns as much room as the name. */}
				<p className="truncate font-mono text-xs opacity-50">/{product.slug}</p>
				<p className="text-subtitle mt-1 opacity-50">
					{product.category}
					{product.new && <span className="ml-2 text-primary">New</span>}
				</p>
			</div>

			<div className="w-24 shrink-0">
				<p className="text-sm font-bold">{formatPrice(product.price)}</p>
				<p className="text-xs opacity-50">order {product.ord}</p>
			</div>

			<div className="w-32 shrink-0">
				<StockCell product={product} />
			</div>

			<Button asChild variant="secondary" className="ml-auto shrink-0">
				<Link to="/admin/$id" params={{ id: product.id }}>
					Edit
				</Link>
			</Button>
		</li>
	);
}

export function CatalogPage() {
	const { data: products, isPending, error } = useProducts();
	const [query, setQuery] = useState('');

	const visible = useMemo(() => (products ?? []).filter((product) => matches(product, query)), [products, query]);

	return (
		<RequireEditor>
			<div className="bg-light pb-24 pt-8 lg:pb-[141px] lg:pt-20">
				<div className="container-app">
					<div className="flex flex-wrap items-center justify-between gap-4">
						<div>
							<h1 className="text-[28px] font-bold uppercase tracking-[1px] sm:text-[32px] sm:leading-9">Catalog</h1>
							<p className="text-body mt-2 opacity-50">
								{products ? `${products.length} product${products.length === 1 ? '' : 's'}` : 'Loading…'}
							</p>
						</div>
						<Button asChild>
							<Link to="/admin/new">New Product</Link>
						</Button>
					</div>

					<div className="mt-8 max-w-[420px]">
						<Input
							type="search"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
							placeholder="Filter by name, slug or category"
							aria-label="Filter products"
						/>
					</div>

					<div className="mt-8">
						{isPending ? (
							<p className="text-body opacity-50">Loading the catalog…</p>
						) : error ? (
							<p className="text-body text-error">{error.message}</p>
						) : visible.length === 0 ? (
							<div className="rounded-lg bg-white px-6 py-12 text-center sm:p-12">
								<p className="text-body opacity-50">
									{products?.length ? 'No product matches that filter.' : 'The catalog is empty.'}
								</p>
							</div>
						) : (
							<ul className="space-y-3">
								{visible.map((product) => (
									<ProductRow key={product.id} product={product} />
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
		</RequireEditor>
	);
}
