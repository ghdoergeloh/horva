import { serve } from "@hono/node-server";

import { seed } from "@horva/core";
import { db } from "@horva/db/client";

import app from "./app";

const port = Number(process.env["API_PORT"]) || 3000;

// Creates the default project on first start. Task creation depends on it.
await seed(db);

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
