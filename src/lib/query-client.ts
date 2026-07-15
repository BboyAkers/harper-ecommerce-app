import { QueryClient } from '@tanstack/react-query';

// The product catalog is effectively static, so keep it fresh for a while and
// don't refetch on window focus.
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});
