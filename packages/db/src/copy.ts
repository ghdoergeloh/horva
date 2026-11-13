import type { SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { getTableName, is, sql } from "drizzle-orm";
import { getTableConfig, PgTable as PgTableClass } from "drizzle-orm/pg-core";

import type { Database } from "./client.js";
import * as schema from "./schema/index.js";

/** Rows per insert; far below the parameter limit of PostgreSQL. */
const CHUNK_SIZE = 500;

/** Rows copied per table, by table name. */
export interface CopyReport {
  rows: Record<string, number>;
}

/**
 * The tables of the schema, each after the tables it references, so that
 * inserts in this order never break a foreign key.
 */
function tablesInInsertOrder(): PgTable[] {
  const tables = (Object.values(schema) as unknown[]).filter(
    (value): value is PgTable => is(value, PgTableClass),
  );
  const ordered: PgTable[] = [];
  const visit = (table: PgTable, path: Set<PgTable>) => {
    if (ordered.includes(table)) return;
    if (path.has(table)) {
      throw new Error(`Foreign key cycle at table ${getTableName(table)}`);
    }
    path.add(table);
    for (const key of getTableConfig(table).foreignKeys) {
      const referenced = key.reference().foreignTable;
      // A table that references itself needs no other table first.
      if (referenced !== table) visit(referenced, path);
    }
    path.delete(table);
    ordered.push(table);
  };
  for (const table of tables) visit(table, new Set());
  return ordered;
}

/**
 * The rows of a raw query. Both drivers (node-postgres and PGlite) return
 * them as `rows`; the driver-independent `Database` type does not know that.
 */
async function queryRows<T>(
  db: Pick<Database, "execute">,
  query: SQL,
): Promise<T[]> {
  const result = (await db.execute(query)) as { rows: T[] };
  return result.rows;
}

async function migrationHashes(db: Database): Promise<string[]> {
  const result = await queryRows<{ hash: string }>(
    db,
    sql`select hash from drizzle.__drizzle_migrations order by id`,
  );
  return result.map((row) => row.hash);
}

async function sequences(db: Database): Promise<string[]> {
  const result = await queryRows<{ name: string }>(
    db,
    sql`select sequence_name as name from information_schema.sequences
        where sequence_schema = 'public' order by sequence_name`,
  );
  return result.map((row) => row.name);
}

/**
 * Copies all rows of the app schema from `source` to `target`, e.g. from a
 * PostgreSQL server to PGlite or back. Both must be migrated to the same
 * migration, and every table of `target` must be empty. The rows keep their
 * ids, and the sequences continue after them. Runs in one transaction on
 * `target`: on an error, `target` stays empty. `source` is only read.
 */
export async function copyDatabase(
  source: Database,
  target: Database,
): Promise<CopyReport> {
  const [sourceMigrations, targetMigrations] = await Promise.all([
    migrationHashes(source),
    migrationHashes(target),
  ]);
  if (sourceMigrations.join() !== targetMigrations.join()) {
    throw new Error(
      "The databases are not on the same migration " +
        `(source: ${sourceMigrations.length}, target: ${targetMigrations.length}). ` +
        "Migrate both to the latest version first.",
    );
  }

  const tables = tablesInInsertOrder();
  const filled: string[] = [];
  for (const table of tables) {
    const [row] = await target
      .select({ one: sql`1` })
      .from(table)
      .limit(1);
    if (row) filled.push(getTableName(table));
  }
  if (filled.length > 0) {
    throw new Error(`The target database is not empty (${filled.join(", ")}).`);
  }

  const report: CopyReport = { rows: {} };
  const sequenceNames = await sequences(source);
  await target.transaction(async (tx) => {
    for (const table of tables) {
      const rows = await source.select().from(table);
      for (let start = 0; start < rows.length; start += CHUNK_SIZE) {
        await tx.insert(table).values(rows.slice(start, start + CHUNK_SIZE));
      }
      report.rows[getTableName(table)] = rows.length;
    }
    for (const name of sequenceNames) {
      const [state] = await queryRows<{
        last_value: string;
        is_called: boolean;
      }>(
        source,
        sql`select last_value, is_called from ${sql.identifier(name)}`,
      );
      if (!state) continue;
      const { last_value, is_called } = state;
      await tx.execute(
        sql`select setval(${`public.${name}`}::regclass, ${last_value}, ${is_called})`,
      );
    }
  });
  return report;
}
