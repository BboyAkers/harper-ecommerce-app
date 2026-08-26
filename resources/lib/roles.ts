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
					// A cart is created, rewritten and emptied by its owner.
					Cart: grant(true, true, true, true),
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
					// Editors shop too; the resource scopes them to their own cart.
					Cart: grant(true, true, true, true),
				},
			},
		},
	},
];

/** A role as `list_roles` reports it. */
interface ExistingRole {
	id: string;
	role: string;
	permission?: { data?: { tables?: Record<string, Partial<TablePermission>> } };
}

/**
 * True when the stored role already grants exactly what this file asks for.
 *
 * Only the tables this app defines are compared. Harper normalises what it
 * stores, and an operator may have granted more by hand, so a deep equality
 * check would rewrite every role on every boot.
 */
function grantsAreCurrent(stored: ExistingRole, wanted: RoleDefinition): boolean {
	const storedTables = stored.permission?.data?.tables ?? {};
	return Object.entries(wanted.permission.data.tables).every(([table, grant]) => {
		const current = storedTables[table];
		return (
			current?.read === grant.read &&
			current?.insert === grant.insert &&
			current?.update === grant.update &&
			current?.delete === grant.delete
		);
	});
}

/**
 * Create any missing application roles, and bring existing ones up to date.
 *
 * Reconciling rather than only creating matters because roles outlive the code:
 * an instance that has already run an older build carries roles that predate
 * whatever table was added since, and a create-only bootstrap would leave every
 * existing customer unable to use it.
 *
 * Runs with authorization bypassed: `server.operation()` without a context sets
 * `bypassAuth`, which is the only way a component can manage roles at startup
 * (there is no authenticated user during component load). The payloads here are
 * constants — nothing from a request reaches this call.
 */
export async function ensureRoles(): Promise<void> {
	const existing = (await server.operation({ operation: 'list_roles' }, undefined)) as ExistingRole[];
	const byName = new Map(existing.map((role) => [role.role, role]));

	for (const definition of ROLES) {
		const current = byName.get(definition.role);

		if (!current) {
			await server.operation({ operation: 'add_role', ...definition }, undefined);
			logger.notify?.(`Created "${definition.role}" role`);
			continue;
		}

		if (grantsAreCurrent(current, definition)) continue;

		await server.operation(
			{ operation: 'alter_role', id: current.id, role: definition.role, permission: definition.permission },
			undefined,
		);
		logger.notify?.(`Updated the "${definition.role}" role's table grants`);
	}
}
