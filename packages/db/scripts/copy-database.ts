/**
 * Copies all Horva data from one database to another, e.g. from PostgreSQL
 * to PGlite or back:
 *
 *   pnpm db:copy <from> <to>
 *
 * Each side is a `postgres://` URL, a `file://` URL or the path of a PGlite
 * folder. The target is migrated first and must be empty. The source must
 * be on the latest migration and is only read. Close the Horva app first:
 * a PGlite folder can be open in one process only.
 */
import { isAbsolute, resolve } from "node:path";

import type { DatabaseConnection } from "../src/client.js";
import { createDatabase, isPgliteUrl, pgliteUrl } from "../src/client.js";
import { copyDatabase } from "../src/copy.js";
import { migrateDatabase } from "../src/migrate.js";

/** A URL as given, or a folder path as a `file:` URL. */
function toUrl(input: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) || isPgliteUrl(input)) {
    return input;
  }
  // pnpm runs the script in packages/db; INIT_CWD is where it was called.
  // oxlint-disable-next-line turbo/no-undeclared-env-vars
  const base = process.env["INIT_CWD"] ?? process.cwd();
  return pgliteUrl(isAbsolute(input) ? input : resolve(base, input));
}

/** The URL without its password, for the output. */
function shown(url: string): string {
  if (isPgliteUrl(url)) return url;
  const parsed = new URL(url);
  if (parsed.password) parsed.password = "***";
  return parsed.toString();
}

async function main(): Promise<void> {
  const [from, to] = process.argv.slice(2).filter((arg) => arg !== "--");
  if (!from || !to) {
    console.error("Usage: pnpm db:copy <from> <to>");
    console.error(
      "Each side is a postgres:// URL, a file:// URL or a PGlite folder.",
    );
    process.exit(2);
  }
  const sourceUrl = toUrl(from);
  const targetUrl = toUrl(to);
  if (sourceUrl === targetUrl) throw new Error("Source and target are equal.");

  const opened: DatabaseConnection[] = [];
  try {
    const source = createDatabase(sourceUrl, { maxConnections: 1 });
    opened.push(source);
    const target = createDatabase(targetUrl, { maxConnections: 1 });
    opened.push(target);

    console.log(`Migrating ${shown(targetUrl)} …`);
    await migrateDatabase(target);
    console.log(`Copying ${shown(sourceUrl)} → ${shown(targetUrl)} …`);
    const report = await copyDatabase(source.db, target.db);
    for (const [table, count] of Object.entries(report.rows)) {
      console.log(`  ${table.padEnd(20)} ${count}`);
    }
    console.log("Done.");
  } finally {
    await Promise.all(opened.map((connection) => connection.close()));
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
