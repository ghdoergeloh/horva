import "dotenv/config";

import { readConfig } from "./config.js";

// Fall back to config file if env var not set
if (!process.env["TT_DATABASE_URL"]) {
  const cfg = readConfig();
  if (cfg?.databaseUrl) process.env["TT_DATABASE_URL"] = cfg.databaseUrl;
}

export { db } from "@repo/db/client";
export type { Db } from "@repo/db/client";
