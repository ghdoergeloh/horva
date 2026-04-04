import "dotenv/config";

import { readConfig } from "./config.js";

// Fall back to config file if env var not set
if (!process.env["TT_DATABASE_URL"]) {
  const cfg = readConfig();
  if (cfg?.databaseUrl) process.env["TT_DATABASE_URL"] = cfg.databaseUrl;
}

export { db } from "@timetracker/db/client";
export type { Db } from "@timetracker/db/client";
