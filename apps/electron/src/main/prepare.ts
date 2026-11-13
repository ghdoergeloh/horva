import type { DatabaseConnection } from "@horva/db/client";
import { isPgliteUrl } from "@horva/db/client";
import { migrateDatabase } from "@horva/db/migrate";

/**
 * Brings the database at `url` to the schema of this app version. The app
 * owns its local database (a PGlite folder) and migrates it on every start.
 * A PostgreSQL server is migrated with `horva migrate`, as before: it may be
 * shared, and older databases there have no migration journal yet.
 */
export async function prepareDatabase(
  connection: Pick<DatabaseConnection, "db">,
  url: string,
): Promise<void> {
  if (isPgliteUrl(url)) await migrateDatabase(connection);
}
