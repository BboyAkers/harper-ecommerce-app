import type { User } from 'harper';
import { unauthorized } from './errors.ts';

/**
 * Session helpers shared by the resources that scope data to a user.
 *
 * Harper's role permissions are table-level — they answer "may this role read
 * Orders at all", not "which orders". Row scoping is the resource's job, and
 * these are the two questions every scoped resource has to ask first.
 */

/** True when the user's role carries the super_user flag. */
export function isSuperUser(user: User | undefined): boolean {
	return user?.role?.permission?.super_user === true;
}

/** The signed-in user, or a 401. */
export function requireUser(user: User | undefined, message?: string): User {
	if (!user?.username) unauthorized(message);
	return user;
}
