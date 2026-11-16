/**
 * Applies all pending migrations to `DATABASE_URL` (from `.env`):
 *
 *   pnpm db:migrate
 *
 * Unlike `drizzle-kit migrate`, it also applies the migrations drizzle
 * skips because of their date (see `migrateDatabase`).
 */
import { createDatabase, shownUrl } from "../src/client.js";
import { migrateDatabase } from "../src/migrate.js";

const url = process.env["DATABASE_URL"];
if (!url) {
  console.error("DATABASE_URL is not set (see .env).");
  process.exit(2);
}

const connection = createDatabase(url, { maxConnections: 1 });
try {
  await migrateDatabase(connection);
  console.log(`Migrated ${shownUrl(url)}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await connection.close();
}
