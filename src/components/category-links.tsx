import { cn } from '@/lib/utils.ts';
import { Link } from 'react-router-dom';

const CATEGORIES = [
	{ name: 'Headphones', slug: 'headphones', image: '/assets/shared/desktop/image-category-thumbnail-headphones.png' },
	{ name: 'Speakers', slug: 'speakers', image: '/assets/shared/desktop/image-category-thumbnail-speakers.png' },
	{ name: 'Earphones', slug: 'earphones', image: '/assets/shared/desktop/image-category-thumbnail-earphones.png' },
];

export function CategoryLinks({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
	return (
		<div className={cn('grid gap-4 sm:grid-cols-3 sm:gap-2.5 lg:gap-[30px]', className)}>
			{CATEGORIES.map((category) => (
				<Link
					key={category.slug}
					to={`/category/${category.slug}`}
					onClick={onNavigate}
					className="group relative mt-[52px] block rounded-lg bg-light px-6 pb-[22px] pt-[88px] text-center"
				>
					<img
						src={category.image}
						alt=""
						className="absolute -top-[52px] left-1/2 h-[140px] w-auto -translate-x-1/2 object-contain drop-shadow-[0_14px_12px_rgba(0,0,0,0.35)]"
					/>
					<h3 className="text-[15px] font-bold uppercase tracking-[1.07px] lg:text-lg lg:tracking-[1.29px]">
						{category.name}
					</h3>
					<span className="mt-[17px] inline-flex items-center gap-[13px] text-[13px] font-bold uppercase tracking-[1px]">
						<span className="opacity-50 transition group-hover:text-primary group-hover:opacity-100">Shop</span>
						<img src="/assets/shared/desktop/icon-arrow-right.svg" alt="" className="h-3 w-2" />
					</span>
				</Link>
			))}
		</div>
	);
}
