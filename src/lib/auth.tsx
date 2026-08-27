import { fetchMe, signIn as signInRequest, signOut as signOutRequest, signUp as signUpRequest } from '@/lib/api.ts';
import type { AuthUser, Credentials } from '@/lib/types.ts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

/**
 * Session state for the storefront.
 *
 * Harper issues an HttpOnly session cookie, so there is no token for the client
 * to hold — `GET /Me` is the only way to ask who is signed in, and the browser
 * carries the cookie automatically. That makes React Query the natural store:
 * the session is server state like anything else, and signing in or out just
 * invalidates it.
 */

export const meQueryKey = ['me'] as const;

interface AuthContextValue {
	user: AuthUser | null;
	/** True only until the first `/Me` answer; avoids flashing the signed-out header. */
	isLoading: boolean;
	signIn: (credentials: Credentials) => Promise<AuthUser>;
	signUp: (credentials: Credentials) => Promise<AuthUser>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
	const queryClient = useQueryClient();

	const session = useQuery({
		queryKey: meQueryKey,
		queryFn: fetchMe,
		// A 401 is a valid answer ("nobody is signed in"), not a failure to retry.
		retry: false,
		staleTime: 5 * 60 * 1000,
	});

	/** Adopt the new user immediately, then drop any data cached for the previous one. */
	function adopt(user: AuthUser) {
		queryClient.setQueryData(meQueryKey, user);
		queryClient.invalidateQueries({ queryKey: ['orders'] });
		return user;
	}

	const signInMutation = useMutation({ mutationFn: signInRequest, onSuccess: adopt });
	const signUpMutation = useMutation({ mutationFn: signUpRequest, onSuccess: adopt });
	const signOutMutation = useMutation({
		mutationFn: signOutRequest,
		onSuccess: () => {
			queryClient.setQueryData(meQueryKey, null);
			// Orders are per-user, so the previous user's must not survive the swap.
			queryClient.removeQueries({ queryKey: ['orders'] });
		},
	});

	const value = useMemo<AuthContextValue>(
		() => ({
			user: session.data ?? null,
			isLoading: session.isLoading,
			signIn: (credentials) => signInMutation.mutateAsync(credentials),
			signUp: (credentials) => signUpMutation.mutateAsync(credentials),
			signOut: async () => {
				await signOutMutation.mutateAsync();
			},
		}),
		[session.data, session.isLoading, signInMutation, signUpMutation, signOutMutation],
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) throw new Error('useAuth must be used within AuthProvider');
	return context;
}

/**
 * Roles that may reach the catalog editor.
 *
 * `editor` is the application role defined in `resources/lib/roles.ts`, which
 * is what actually carries the Product insert/update/delete grants.
 * `super_user` is included so an administrator can use the UI without having to
 * be granted a second role.
 *
 * This gates what the storefront *renders*, not what the server *allows*.
 * Harper re-checks the role's table grants on every write, so hiding the link
 * is a courtesy to customers, never the control.
 */
const CATALOG_ROLES: ReadonlySet<string> = new Set(['editor', 'super_user']);

export function canEditCatalog(user: AuthUser | null): boolean {
	return user?.role !== undefined && CATALOG_ROLES.has(user.role);
}
