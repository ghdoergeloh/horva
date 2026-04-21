import { is } from "@electron-toolkit/utils";
import { app } from "electron";

import { readConfig } from "@horva/core/config";

// Load .env before importing db.
// In dev: load from monorepo root so pnpm dev picks up the local docker URL.
// In prod: load from userData dir (if present — primarily a way for users to
// override without editing config.json).
const { default: dotenv } = await import("dotenv");
if (is.dev) {
  dotenv.config({
    path: new URL("../../../../.env", import.meta.url).pathname,
  });
} else {
  dotenv.config({
    path: new URL(".env", `file://${app.getPath("userData")}/`).pathname,
  });
}

// Fall back to the shared config.json if DATABASE_URL wasn't set via env.
// Phase 5 onwards, config.json is the canonical source populated by the
// first-launch wizard.
if (!process.env["DATABASE_URL"]) {
  const cfg = readConfig();
  if (cfg?.databaseUrl) {
    process.env["DATABASE_URL"] = cfg.databaseUrl;
  }
}

export { db } from "@horva/db/client";
export type { Db } from "@horva/db/client";
