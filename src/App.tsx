import { router } from '@/router.tsx';
import { RouterProvider } from '@tanstack/react-router';

export function App() {
	return <RouterProvider router={router} />;
}
