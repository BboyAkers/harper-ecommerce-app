import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import { useAuth } from '@/lib/auth.tsx';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useEffect, useState } from 'react';

type Mode = 'sign-in' | 'sign-up';

const COPY = {
	'sign-in': {
		heading: 'Sign In',
		submit: 'Sign In',
		pending: 'Signing in…',
		switchPrompt: 'New here?',
		switchAction: 'Create an account',
	},
	'sign-up': {
		heading: 'Create Account',
		submit: 'Create Account',
		pending: 'Creating account…',
		switchPrompt: 'Already have an account?',
		switchAction: 'Sign in',
	},
} as const;

export function SignInPage() {
	const navigate = useNavigate();
	const { user, signIn, signUp } = useAuth();
	const [mode, setMode] = useState<Mode>('sign-in');
	const [username, setUsername] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | undefined>();
	const [pending, setPending] = useState(false);

	// Nothing to do here once signed in — including when a session was already
	// live on first render.
	useEffect(() => {
		if (user) navigate({ to: '/account', replace: true });
	}, [user, navigate]);

	const copy = COPY[mode];

	async function submit(event: FormEvent) {
		event.preventDefault();
		setError(undefined);
		setPending(true);
		try {
			await (mode === 'sign-in' ? signIn : signUp)({ username: username.trim(), password });
			navigate({ to: '/account' });
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : 'Something went wrong. Please try again.');
		} finally {
			setPending(false);
		}
	}

	return (
		<div className="bg-light pb-24 pt-8 lg:pb-[141px] lg:pt-20">
			<div className="container-app">
				<div className="mx-auto max-w-[480px] rounded-lg bg-white px-6 py-8 sm:p-12">
					<h1 className="text-[28px] font-bold uppercase tracking-[1px] sm:text-[32px] sm:leading-9">
						{copy.heading}
					</h1>
					<p className="text-body mt-3 opacity-50">
						Orders placed while signed in are kept in your account history.
					</p>

					<form onSubmit={submit} noValidate className="mt-8 space-y-6">
						<div>
							<Label htmlFor="username">Username</Label>
							<div className="mt-2">
								<Input
									id="username"
									value={username}
									onChange={(event) => setUsername(event.target.value)}
									placeholder="alexei.ward"
									autoComplete="username"
									autoCapitalize="none"
									spellCheck={false}
									required
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="password">Password</Label>
							<div className="mt-2">
								<Input
									id="password"
									type="password"
									value={password}
									onChange={(event) => setPassword(event.target.value)}
									placeholder="At least 8 characters"
									autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
									required
								/>
							</div>
						</div>

						{error && <p className="text-body text-error">{error}</p>}

						<Button type="submit" disabled={pending || !username.trim() || !password} className="w-full">
							{pending ? copy.pending : copy.submit}
						</Button>
					</form>

					<p className="text-body mt-6 opacity-50">
						{copy.switchPrompt}{' '}
						<button
							type="button"
							className="cursor-pointer font-bold text-primary underline"
							onClick={() => {
								setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
								setError(undefined);
							}}
						>
							{copy.switchAction}
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
