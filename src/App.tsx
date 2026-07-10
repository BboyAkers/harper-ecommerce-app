import { Footer } from '@/components/footer.tsx';
import { Header } from '@/components/header.tsx';
import { CartProvider } from '@/lib/cart.tsx';
import { CategoryPage } from '@/pages/category.tsx';
import { CheckoutPage } from '@/pages/checkout.tsx';
import { HomePage } from '@/pages/home.tsx';
import { ProductPage } from '@/pages/product.tsx';
import { useEffect } from 'react';
import { createHashRouter, Outlet, RouterProvider, useLocation } from 'react-router-dom';

function ScrollToTop() {
	const { pathname } = useLocation();
	useEffect(() => {
		window.scrollTo(0, 0);
	}, [pathname]);
	return null;
}

function Layout() {
	return (
		<CartProvider>
			<ScrollToTop />
			<Header />
			<main>
				<Outlet />
			</main>
			<Footer />
		</CartProvider>
	);
}

const router = createHashRouter([
	{
		element: <Layout />,
		children: [
			{ path: '/', element: <HomePage /> },
			{ path: '/category/:category', element: <CategoryPage /> },
			{ path: '/product/:slug', element: <ProductPage /> },
			{ path: '/checkout', element: <CheckoutPage /> },
		],
	},
]);

export function App() {
	return <RouterProvider router={router} />;
}
