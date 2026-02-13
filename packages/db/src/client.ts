import "dotenv/config";

import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";

if (!process.env["DATABASE_URL"]) {
  throw new Error("DATABASE_URL is not set");
}

const db: NodePgDatabase = drizzle(process.env["DATABASE_URL"]);

export default db;
