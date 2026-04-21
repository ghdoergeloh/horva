import "dotenv/config";

import { readConfig } from "./config.js";

// Fall back to config file if env var not set
if (!process.env["DATABASE_URL"]) {
  const cfg = readConfig();
  if (cfg?.databaseUrl) process.env["DATABASE_URL"] = cfg.databaseUrl;
}

export { db } from "@horva/db/client";
export type { Db } from "@horva/db/client";
