import { Button } from '@/components/ui/button.tsx';
import { useAuth } from '@/lib/auth.tsx';
import { useMyOrders } from '@/lib/queries.ts';
import type { OrderRecord } from '@/lib/types.ts';
import { formatPrice } from '@/lib/utils.ts';
import { Link, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';

const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' });

function formatDate(value: string) {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? value : dateFormat.format(parsed);
}

function OrderCard({ order }: { order: OrderRecord }) {
	return (
		<li className="rounded-lg bg-white px-6 py-8 sm:p-8">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<p className="text-subtitle tracking-[0.93px] text-primary">{formatDate(order.createdAt)}</p>
					{/* The id is what a customer would quote to support, so show it in full. */}
					<p className="mt-1 font-mono text-xs opacity-50">{order.id}</p>
				</div>
				<p className="text-lg font-bold">{formatPrice(order.grandTotal)}</p>
			</div>

			<ul className="mt-6 space-y-4">
				{order.items.map((item) => (
					<li key={item.slug} className="flex items-center gap-4">
						<img src={item.image} alt="" className="size-16 rounded-lg" />
						<div className="min-w-0 flex-1">
							<Link
								to="/product/$slug"
								params={{ slug: item.slug }}
								className="truncate text-[15px] font-bold transition-colors hover:text-primary"
							>
								{item.name}
							</Link>
							<p className="text-sm font-bold opacity-50">{formatPrice(item.price)}</p>
						</div>
						<span className="text-[15px] font-bold opacity-50">x{item.quantity}</span>
					</li>
				))}
			</ul>
		</li>
	);
}

export function AccountPage() {
	const navigate = useNavigate();
	const { user, isLoading: sessionLoading, signOut } = useAuth();
	const orders = useMyOrders(!!user);

	useEffect(() => {
		if (!sessionLoading && !user) navigate({ to: '/sign-in', replace: true });
	}, [sessionLoading, user, navigate]);

	return (
		<div className="bg-light pb-24 pt-8 lg:pb-[141px] lg:pt-20">
			<div className="container-app">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-[28px] font-bold uppercase tracking-[1px] sm:text-[32px] sm:leading-9">
							Your Orders
						</h1>
						{user && <p className="text-body mt-2 opacity-50">Signed in as {user.username}</p>}
					</div>
					<Button
						variant="secondary"
						onClick={async () => {
							await signOut();
							navigate({ to: '/' });
						}}
					>
						Sign Out
					</Button>
				</div>

				<div className="mt-8">
					{sessionLoading || (user && orders.isPending) ? (
						<p className="text-body opacity-50">Loading your orders…</p>
					) : orders.isError ? (
						<p className="text-body text-error">
							{orders.error instanceof Error ? orders.error.message : 'Failed to load your orders.'}
						</p>
					) : orders.data && orders.data.length > 0 ? (
						<ul className="space-y-6">
							{orders.data.map((order) => (
								<OrderCard key={order.id} order={order} />
							))}
						</ul>
					) : (
						<div className="rounded-lg bg-white px-6 py-12 text-center sm:p-12">
							<p className="text-body opacity-50">
								You haven't placed any orders yet. Orders placed as a guest aren't listed here.
							</p>
							<Button asChild className="mt-6">
								<Link to="/products">Browse products</Link>
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
