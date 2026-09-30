import { createDatabase } from "@horva/db/client";
import { migrateDatabase } from "@horva/db/migrate";

/**
 * Applies all pending migrations of `packages/db/drizzle` to `databaseUrl`.
 * The bundle carries them in `dist/drizzle` (see `build.mjs`).
 */
export async function runMigrations(databaseUrl: string): Promise<void> {
  const connection = createDatabase(databaseUrl, { maxConnections: 1 });
  try {
    await migrateDatabase(connection);
  } finally {
    await connection.close();
  }
}
