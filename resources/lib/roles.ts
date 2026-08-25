import { logger, server } from 'harper';

/**
 * Application roles, created on startup if absent.
 *
 * Harper permissions are table-level. Row-level scoping — "a customer reads
 * only their own orders" — is enforced by the resources via `rowFilter`, not
 * here; this grants the coarse capability and the resource narrows it.
 */

export const CUSTOMER_ROLE = 'customer';
export const EDITOR_ROLE = 'editor';

interface TablePermission {
	read: boolean;
	insert: boolean;
	update: boolean;
	delete: boolean;
	attribute_permissions: [];
}

function grant(read: boolean, insert: boolean, update: boolean, remove: boolean): TablePermission {
	return { read, insert, update, delete: remove, attribute_permissions: [] };
}

interface RoleDefinition {
	role: string;
	permission: {
		super_user: boolean;
		data: { tables: Record<string, TablePermission> };
	};
}

const ROLES: RoleDefinition[] = [
	{
		// Shoppers: browse the catalog, place orders, read their own back.
		role: CUSTOMER_ROLE,
		permission: {
			super_user: false,
			data: {
				tables: {
					Product: grant(true, false, false, false),
					Order: grant(true, true, false, false),
				},
			},
		},
	},
	{
		// Content editors: everything a customer can do, plus catalog authoring.
		role: EDITOR_ROLE,
		permission: {
			super_user: false,
			data: {
				tables: {
					Product: grant(true, true, true, true),
					Order: grant(true, false, true, false),
				},
			},
		},
	},
];

/**
 * Create any missing application roles.
 *
 * Runs with authorization bypassed: `server.operation()` without a context sets
 * `bypassAuth`, which is the only way a component can manage roles at startup
 * (there is no authenticated user during component load). The payloads here are
 * constants — nothing from a request reaches this call.
 */
export async function ensureRoles(): Promise<void> {
	const existing = (await server.operation({ operation: 'list_roles' }, undefined)) as { role: string }[];
	const present = new Set(existing.map((role) => role.role));

	for (const definition of ROLES) {
		if (present.has(definition.role)) continue;
		await server.operation({ operation: 'add_role', ...definition }, undefined);
		logger.notify?.(`Created "${definition.role}" role`);
	}
}
