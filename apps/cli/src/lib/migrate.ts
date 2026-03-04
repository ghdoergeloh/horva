import pg from "pg";

// Imported as plain text by esbuild (loader: { ".sql": "text" })
// @ts-expect-error – no type declaration for .sql imports
import migrationSql from "../../../../packages/db/drizzle/0000_thick_amazoness.sql";

export async function runMigrations(databaseUrl: string): Promise<void> {
  const pool = new pg.Pool({ connectionString: databaseUrl });
  try {
    const statements = (migrationSql as string)
      .split("--> statement-breakpoint")
      .map((s: string) => s.trim())
      .filter(Boolean);

    for (const statement of statements) {
      await pool.query(statement);
    }
  } finally {
    await pool.end();
  }
}
