import { readMigrationFiles } from "drizzle-orm/migrator";

import type { Database } from "./client.js";
import { appTableNames, migrationHashes, queryRows } from "./copy.js";
import { sql } from "./index.js";
import { migrationsFolder } from "./migrate.js";

/** What a database holds, before Horva uses it or copies into it. */
export interface DatabaseInspection {
  /** Some tables of Horva exist. */
  hasSchema: boolean;
  /**
   * The applied migrations compared with the ones of this version:
   * `none` (no journal), `latest`, `behind` (some of them are missing) or
   * `other` (migrations this version does not know).
   */
  migrations: "none" | "latest" | "behind" | "other";
  /** Tables in the `public` schema that are not Horva's. */
  foreignTables: string[];
  /** No table of Horva holds a row. */
  empty: boolean;
}

/** The hashes of the migrations of this version, oldest first. */
function latestMigrationHashes(): string[] {
  return readMigrationFiles({ migrationsFolder: migrationsFolder() }).map(
    (migration) => migration.hash,
  );
}

async function publicTables(db: Pick<Database, "execute">): Promise<string[]> {
  const rows = await queryRows<{ name: string }>(
    db,
    sql`select table_name as name from information_schema.tables
        where table_schema = 'public' order by table_name`,
  );
  return rows.map((row) => row.name);
}

async function appliedMigrations(
  db: Pick<Database, "execute">,
): Promise<string[] | null> {
  const [journal] = await queryRows<{ name: string | null }>(
    db,
    sql`select to_regclass('drizzle.__drizzle_migrations')::text as name`,
  );
  return journal?.name ? migrationHashes(db) : null;
}

/** Looks at a database without changing it. */
export async function inspectDatabase(
  db: Pick<Database, "execute">,
): Promise<DatabaseInspection> {
  const ours = new Set(appTableNames());
  const tables = await publicTables(db);
  const present = tables.filter((table) => ours.has(table));

  let empty = true;
  for (const table of present) {
    const [row] = await queryRows(
      db,
      sql`select 1 from ${sql.identifier(table)} limit 1`,
    );
    if (row) {
      empty = false;
      break;
    }
  }

  const applied = await appliedMigrations(db);
  const latest = latestMigrationHashes();
  let migrations: DatabaseInspection["migrations"] = "none";
  if (applied !== null && applied.length > 0) {
    // A repaired migration is recorded later than its place: compare the
    // sets, not the order.
    const known = new Set(latest);
    const done = new Set(applied);
    if (applied.some((hash) => !known.has(hash))) migrations = "other";
    else
      migrations = latest.every((hash) => done.has(hash)) ? "latest" : "behind";
  }

  return {
    hasSchema: present.length > 0,
    migrations,
    foreignTables: tables.filter((table) => !ours.has(table)),
    empty,
  };
}
