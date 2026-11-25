import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import pg from "pg";

import { acquireLock } from "./lock.js";
import * as schema from "./schema/index.js";

export { DatabaseLockedError } from "./lock.js";

/**
 * A database with the app schema, independent of the driver: node-postgres
 * in the app, PGlite in tests (see `@horva/db/testing`). Services and
 * handlers take this type.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;

/** A connection pool (or a PGlite folder) and the database on top of it. */
export interface DatabaseConnection {
  db: Database;
  /** Resolves when the database answers a query, e.g. for `/ready`. */
  ping(): Promise<void>;
  /** Closes all connections of the pool. */
  close(): Promise<void>;
}

/** True for a `file:` URL, which {@link createDatabase} opens with PGlite. */
export function isPgliteUrl(url: string): boolean {
  return url.startsWith("file:");
}

/** The `file:` URL of a PGlite data folder. */
export function pgliteUrl(dataDir: string): string {
  return pathToFileURL(dataDir).href;
}

/**
 * Throws unless `url` is one that {@link createDatabase} opens: a
 * PostgreSQL URL or the `file:` URL of a folder.
 */
export function checkDatabaseUrl(url: string): void {
  if (!/^(postgres(ql)?:\/\/|file:\/\/\/)/.test(url)) {
    throw new Error("Database URL must be a postgres:// or file:/// URL");
  }
}

/** The URL without its password, for output. */
export function shownUrl(url: string): string {
  if (isPgliteUrl(url)) return url;
  const parsed = new URL(url);
  if (parsed.password) parsed.password = "***";
  return parsed.toString();
}

/**
 * Opens the database at `url`:
 *
 * - `postgres://` or `postgresql://`: a connection pool. The pool connects
 *   on the first query, so creating it never fails and needs no running
 *   database.
 * - `file:///path/to/folder`: an embedded PostgreSQL (PGlite) that keeps its
 *   data in that folder. Only one process may open a folder; a second one
 *   gets a `DatabaseLockedError` here.
 */
export function createDatabase(
  url: string,
  options: { maxConnections?: number } = {},
): DatabaseConnection {
  if (isPgliteUrl(url)) return createPgliteDatabase(fileURLToPath(url));
  const pool = new pg.Pool({
    connectionString: url,
    max: options.maxConnections ?? 10,
    // Without a limit, a request or /ready waits until the operating system
    // gives up on an unreachable database.
    connectionTimeoutMillis: 5000,
  });
  const db = drizzle({ client: pool, schema });
  return {
    db,
    ping: async () => {
      await db.execute(sql`select 1`);
    },
    close: () => pool.end(),
  };
}

/**
 * The PostgreSQL major of the installed PGlite. PGlite opens only data
 * folders of the same major; a new one needs a migration of the folders.
 */
export const PGLITE_POSTGRES_MAJOR = 18;

/**
 * PGlite creates a database in any folder, also next to other files. A
 * folder must be missing, empty or already hold a database of
 * {@link PGLITE_POSTGRES_MAJOR}.
 */
function checkDataDir(dataDir: string): void {
  if (!existsSync(dataDir)) return;
  const entries = readdirSync(dataDir);
  if (entries.length === 0) return;
  if (!entries.includes("PG_VERSION")) {
    throw new Error(
      `The folder ${dataDir} is not empty and holds no database. ` +
        "Choose a new or empty folder.",
    );
  }
  const major = readFileSync(join(dataDir, "PG_VERSION"), "utf8").trim();
  if (major !== String(PGLITE_POSTGRES_MAJOR)) {
    throw new Error(
      `The folder ${dataDir} holds a PostgreSQL ${major} database. ` +
        `This version of horva opens PostgreSQL ${PGLITE_POSTGRES_MAJOR} databases only.`,
    );
  }
}

function createPgliteDatabase(dataDir: string): DatabaseConnection {
  checkDataDir(dataDir);
  const lock = acquireLock(dataDir);
  let client: PGlite;
  try {
    client = new PGlite(dataDir);
  } catch (error) {
    lock.release();
    throw error;
  }
  const db = drizzlePglite({ client, schema });
  let closing: Promise<void> | undefined;
  return {
    db,
    ping: async () => {
      await db.execute(sql`select 1`);
    },
    close: () => {
      closing ??= client.close().finally(() => {
        lock.release();
      });
      return closing;
    },
  };
}
