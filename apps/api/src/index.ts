import { seed } from "@horva/core";
import { createDatabase } from "@horva/db/client";

import { loadEnv } from "./env";
import { startServer } from "./server";

const env = loadEnv();
startServer(env);

// Creates the default project on first start; task creation depends on it.
// A database that is not up yet does not stop the server: /health still
// answers and /ready reports the database.
const database = createDatabase(env.databaseUrl, { maxConnections: 1 });
seed(database.db)
  .catch((error: unknown) => {
    console.error("Could not create the default project:", error);
  })
  .finally(() => void database.close());
