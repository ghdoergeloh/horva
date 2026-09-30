import { seed } from "@horva/core";
import { createDatabase } from "@horva/db/client";

import { loadEnv } from "./env";
import { startServer } from "./server";

const env = loadEnv();

// Creates the default project on first start. Task creation depends on it.
const database = createDatabase(env.databaseUrl, { maxConnections: 1 });
try {
  await seed(database.db);
} finally {
  await database.close();
}

startServer(env);
