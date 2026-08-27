import { databases } from 'harper';

/**
 * The application's database, named rather than left as Harper's default.
 *
 * Harper puts a `@table` in the `data` database unless the schema says
 * otherwise, and `import { tables } from 'harper'` is a shortcut for exactly
 * that default. Once `schemas/*.graphql` declares
 * `@table(database: "harper_ecommerce_app")`, the bare `tables` export no
 * longer sees this app's tables at all — they live under
 * `databases.harper_ecommerce_app`.
 *
 * Naming the database is worth the indirection because the name is part of the
 * app's public surface in three places that have nothing to do with each other:
 * the operations API (`describe_all`, backups, `drop_schema`), role grants
 * (`permission.<database>.tables.<table>` — see `roles.ts`), and any second
 * component installed on the same instance, which would otherwise share `data`
 * and collide on a type name.
 *
 * Re-exporting as `tables` keeps every call site reading `tables.Product`, so
 * this file is the only place the database name appears in TypeScript.
 */
export const DATABASE_NAME = 'harper_ecommerce_app';

/**
 * Captured at module load, which is safe because `config.yaml` lists
 * `graphqlSchema` before `jsResource`: the tables exist by the time any
 * resource imports this. Harper mutates this object in place as tables are
 * defined, so it is a live reference and not a snapshot.
 */
export const tables = databases[DATABASE_NAME];
