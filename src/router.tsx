import { Footer } from '@/components/footer.tsx';
import { Header } from '@/components/header.tsx';
import { CartProvider } from '@/lib/cart.tsx';
import { CategoryPage } from '@/pages/category.tsx';
import { CheckoutPage } from '@/pages/checkout.tsx';
import { HomePage } from '@/pages/home.tsx';
import { ProductPage } from '@/pages/product.tsx';
import { AllProductsPage } from '@/pages/products.tsx';
import { createHashHistory, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';

function RootLayout() {
	return (
		<CartProvider>
			<Header />
			<main>
				<Outlet />
			</main>
			<Footer />
		</CartProvider>
	);
}

const rootRoute = createRootRoute({ component: RootLayout });

const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: HomePage });
const productsRoute = createRoute({ getParentRoute: () => rootRoute, path: '/products', component: AllProductsPage });
const categoryRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/category/$category',
	component: CategoryPage,
});
const productRoute = createRoute({ getParentRoute: () => rootRoute, path: '/product/$slug', component: ProductPage });
const checkoutRoute = createRoute({ getParentRoute: () => rootRoute, path: '/checkout', component: CheckoutPage });

const routeTree = rootRoute.addChildren([indexRoute, productsRoute, categoryRoute, productRoute, checkoutRoute]);

// Hash history keeps deep links working behind Harper's static handler (see config.yaml).
// scrollRestoration resets to top on new navigations and restores position on back/forward.
export const router = createRouter({
	routeTree,
	history: createHashHistory(),
	scrollRestoration: true,
	defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router;
	}
}
