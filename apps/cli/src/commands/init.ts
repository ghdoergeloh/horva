import type { Command } from "commander";
import { confirm, input } from "@inquirer/prompts";

import type { Db } from "@repo/db/client";
import { seed } from "@repo/core";

import { configPath, readConfig, writeConfig } from "../lib/config.js";
import { printError, printSuccess, sym } from "../lib/display.js";
import { runMigrations } from "../lib/migrate.js";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Configure database connection and initialize tt")
    .action(async () => {
      try {
        const existing = readConfig();

        if (existing) {
          const overwrite = await confirm({
            message: `Config already exists at ${configPath()}. Overwrite?`,
            default: false,
          });
          if (!overwrite) {
            console.log("Keeping existing config.");
            return;
          }
        }

        const databaseUrl = await input({
          message: "PostgreSQL connection URL:",
          default: existing?.databaseUrl ?? "postgres://localhost:5432/tt",
          validate: (v) =>
            v.startsWith("postgres") || "Must be a postgres:// URL",
        });

        writeConfig({ databaseUrl });
        printSuccess(`${sym.checked} Config written to ${configPath()}`);

        // Set for the current process so the db client can connect
        process.env["TT_DATABASE_URL"] = databaseUrl;

        await runMigrations(databaseUrl);
        printSuccess(`${sym.checked} Schema applied.`);

        // Lazily import db after env is set
        const dbModule = (await import("../lib/db.js")) as { db: Db };
        await seed(dbModule.db);
        printSuccess(`${sym.checked} Database initialized.`);
      } catch (err) {
        printError(`Init failed: ${String(err)}`);
        process.exit(1);
      }
    });
}
