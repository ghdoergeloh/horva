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
import { runCopy } from "../src/copy-command.js";

const [from, to] = process.argv.slice(2).filter((arg) => arg !== "--");
if (!from || !to) {
  console.error("Usage: pnpm db:copy <from> <to>");
  console.error(
    "Each side is a postgres:// URL, a file:// URL or a PGlite folder.",
  );
  process.exit(2);
}

// pnpm runs the script in packages/db; INIT_CWD is where it was called.
// oxlint-disable-next-line turbo/no-undeclared-env-vars
const base = process.env["INIT_CWD"] ?? process.cwd();

runCopy(from, to, { base, log: (line) => console.log(line) }).catch(
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
