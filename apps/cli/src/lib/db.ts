import { config } from "dotenv";

import type { Database } from "@horva/db/client";
import { createLazyDatabase } from "@horva/db/lazy";

import { readConfig } from "./config.js";

config({ quiet: true });

// The database of the CLI. It connects on the first query, so `horva init`
// can set DATABASE_URL first; without it, the URL of the config file counts.
const connection = createLazyDatabase(
  () => process.env["DATABASE_URL"] ?? readConfig()?.databaseUrl,
);

export const db: Database = connection.db;
export type Db = Database;

/** Ends the pool, so the process can exit. */
export const closeDb = (): Promise<void> => connection.close();
