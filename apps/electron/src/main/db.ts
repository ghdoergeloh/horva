import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { is } from "@electron-toolkit/utils";
import { app } from "electron";

// Load .env before importing db
// In dev: load from monorepo root; in prod: from userData dir
const { default: dotenv } = await import("dotenv");
if (is.dev) {
  dotenv.config({ path: join(app.getAppPath(), "../../../.env") });
} else {
  dotenv.config({ path: join(app.getPath("userData"), ".env") });
}

// Fall back to ~/.config/tt/config.json (or $XDG_CONFIG_HOME/tt/config.json) if
// TT_DATABASE_URL is not set via .env. This allows production installs to store
// DB credentials in a separate config file instead of a .env file.
if (!process.env["TT_DATABASE_URL"]) {
  const configPath = join(
    process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config"),
    "tt",
    "config.json",
  );
  if (existsSync(configPath)) {
    try {
      const cfg = JSON.parse(readFileSync(configPath, "utf8")) as {
        databaseUrl?: string;
      };
      if (cfg.databaseUrl) process.env["TT_DATABASE_URL"] = cfg.databaseUrl;
    } catch {
      // ignore parse errors
    }
  }
}

export { db } from "@timetracker/db/client";
export type { Db } from "@timetracker/db/client";
