import { join } from "node:path";
import dotenv from "dotenv";

import { configDir, readConfig } from "@horva/core/config";
import { createLazyDatabase } from "@horva/db/lazy";

// An optional .env next to config.json lets a user set DATABASE_URL
// without the setup wizard.
dotenv.config({ path: join(configDir(), ".env"), quiet: true });

// Otherwise the URL of config.json, which the setup wizard writes.
if (!process.env["DATABASE_URL"]) {
  const cfg = readConfig();
  if (cfg?.databaseUrl) process.env["DATABASE_URL"] = cfg.databaseUrl;
}

// Connects on the first query, so the setup wizard can set DATABASE_URL
// first.
export const connection = createLazyDatabase(() => process.env["DATABASE_URL"]);
export const { db } = connection;
