import { existsSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { DatabaseConnection } from "./client.js";
import { createDatabase, isPgliteUrl, pgliteUrl, shownUrl } from "./client.js";
import { copyDatabase } from "./copy.js";
import { inspectDatabase } from "./inspect.js";
import { migrateDatabase } from "./migrate.js";

/** A URL as given, or a folder path (relative to `base`) as a `file:` URL. */
export function toDatabaseUrl(input: string, base: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) || isPgliteUrl(input)) {
    return input;
  }
  return pgliteUrl(isAbsolute(input) ? input : resolve(base, input));
}

/**
 * Checks what can be checked before the target is migrated: the source is
 * on the latest migration, and the target has no tables of another app.
 */
async function checkBeforeMigration(
  source: DatabaseConnection,
  target: DatabaseConnection,
): Promise<void> {
  const [from, to] = await Promise.all([
    inspectDatabase(source.db),
    inspectDatabase(target.db),
  ]);
  if (from.migrations !== "latest") {
    throw new Error(
      "The source database is not on the latest migration. " +
        "Start the app with it once, or run `pnpm db:migrate`, then try again.",
    );
  }
  if (to.foreignTables.length > 0) {
    throw new Error(
      `The target database has tables of another app (${to.foreignTables.join(", ")}).`,
    );
  }
}

/**
 * `pnpm db:copy <from> <to>`: migrates `to` and copies all data of `from`
 * into it. Each side is a database URL or a PGlite folder path, relative to
 * `base`.
 */
export async function runCopy(
  from: string,
  to: string,
  { base, log }: { base: string; log: (line: string) => void },
): Promise<void> {
  const sourceUrl = toDatabaseUrl(from, base);
  const targetUrl = toDatabaseUrl(to, base);
  if (sourceUrl === targetUrl) {
    throw new Error("Source and target are the same database.");
  }

  if (isPgliteUrl(sourceUrl)) {
    const folder = fileURLToPath(sourceUrl);
    if (!existsSync(join(folder, "PG_VERSION"))) {
      throw new Error(`There is no database in ${folder}.`);
    }
  }

  const opened: DatabaseConnection[] = [];
  try {
    const source = createDatabase(sourceUrl, { maxConnections: 1 });
    opened.push(source);
    const target = createDatabase(targetUrl, { maxConnections: 1 });
    opened.push(target);

    await checkBeforeMigration(source, target);
    log(`Migrating ${shownUrl(targetUrl)} …`);
    await migrateDatabase(target);
    log(`Copying ${shownUrl(sourceUrl)} → ${shownUrl(targetUrl)} …`);
    const report = await copyDatabase(source.db, target.db);
    for (const [table, count] of Object.entries(report.rows)) {
      log(`  ${table.padEnd(20)} ${count}`);
    }
    log("Done.");
  } finally {
    await Promise.all(opened.map((connection) => connection.close()));
  }
}
