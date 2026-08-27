import { canEditCatalog, useAuth } from '@/lib/auth.tsx';
import { useNavigate } from '@tanstack/react-router';
import { type ReactNode, useEffect } from 'react';

/**
 * Gate for the catalog editor's routes.
 *
 * This decides what to *render*, not what is *permitted*. Harper checks the
 * signed-in role's table grants on every write (`Table.allowCreate` and
 * friends, against the grants in `resources/lib/roles.ts`), so a customer who
 * types /admin into the address bar would reach a form whose Save button 403s.
 * Redirecting them is a courtesy; treating this as the access control would be
 * a mistake.
 */
export function RequireEditor({ children }: { children: ReactNode }) {
	const navigate = useNavigate();
	const { user, isLoading } = useAuth();
	const allowed = canEditCatalog(user);

	useEffect(() => {
		if (isLoading || allowed) return;
		// Signed out and signed in without the role are different answers: the
		// first is fixable at /sign-in, the second is not fixable by the visitor.
		navigate({ to: user ? '/' : '/sign-in', replace: true });
	}, [isLoading, allowed, user, navigate]);

	// Render nothing useful until the session resolves, so the editor never
	// flashes for someone who turns out not to be one.
	if (!allowed) {
		return (
			<div className="container-app py-24">
				<p className="text-body opacity-50">{isLoading ? 'Checking your access…' : 'Redirecting…'}</p>
			</div>
		);
	}

	return <>{children}</>;
}
