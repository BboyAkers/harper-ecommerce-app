import { Footer } from '@/components/footer.tsx';
import { Header } from '@/components/header.tsx';
import { AuthProvider } from '@/lib/auth.tsx';
import { CartProvider } from '@/lib/cart.tsx';
import { AccountPage } from '@/pages/account.tsx';
import { CatalogPage } from '@/pages/admin/catalog.tsx';
import { EditProductPage, NewProductPage } from '@/pages/admin/product-editor.tsx';
import { CategoryPage } from '@/pages/category.tsx';
import { CheckoutPage } from '@/pages/checkout.tsx';
import { HomePage } from '@/pages/home.tsx';
import { ProductPage } from '@/pages/product.tsx';
import { AllProductsPage } from '@/pages/products.tsx';
import { SignInPage } from '@/pages/sign-in.tsx';
import { createHashHistory, createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router';

function RootLayout() {
	return (
		<AuthProvider>
			<CartProvider>
				<Header />
				<main>
					<Outlet />
				</main>
				<Footer />
			</CartProvider>
		</AuthProvider>
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
const signInRoute = createRoute({ getParentRoute: () => rootRoute, path: '/sign-in', component: SignInPage });
const accountRoute = createRoute({ getParentRoute: () => rootRoute, path: '/account', component: AccountPage });

// Catalog editor, for the `editor` role. '/admin/new' is declared before the
// dynamic '/admin/$id' for readability only — the router ranks a static segment
// above a dynamic one regardless of order, so 'new' can never be read as an id.
const adminRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin', component: CatalogPage });
const adminNewRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/new', component: NewProductPage });
const adminEditRoute = createRoute({ getParentRoute: () => rootRoute, path: '/admin/$id', component: EditProductPage });

const routeTree = rootRoute.addChildren([
	indexRoute,
	productsRoute,
	categoryRoute,
	productRoute,
	checkoutRoute,
	signInRoute,
	accountRoute,
	adminRoute,
	adminNewRoute,
	adminEditRoute,
]);

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
