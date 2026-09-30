import { Command } from "commander";

import { registerInitCommand } from "./commands/init.js";
import { registerLabelCommands } from "./commands/label.js";
import { registerLogCommands } from "./commands/log.js";
import { registerProjectCommands } from "./commands/project.js";
import { registerSlotCommands } from "./commands/slot.js";
import { registerSlotMgmtCommands } from "./commands/slotMgmt.js";
import { registerTaskCommands } from "./commands/task.js";
import { readConfig } from "./lib/config.js";
import { closeDb } from "./lib/db.js";
import { runMigrations } from "./lib/migrate.js";

/** What the program uses besides the commands; tests replace it. */
export interface CliDeps {
  log: (line: string) => void;
  /** `DATABASE_URL`, else the URL of the config file. */
  databaseUrl: () => string | undefined;
  migrate: (databaseUrl: string) => Promise<void>;
  /** Ends the database pool, so the process can exit. */
  close: () => Promise<void>;
}

const defaultDeps: CliDeps = {
  log: (line) => console.log(line),
  databaseUrl: () => process.env["DATABASE_URL"] ?? readConfig()?.databaseUrl,
  migrate: runMigrations,
  close: closeDb,
};

/** The horva CLI with all its commands. */
export function createProgram(deps: CliDeps = defaultDeps): Command {
  const program = new Command();

  program.name("horva").description("Horva time tracking CLI").version("0.1.0");

  registerInitCommand(program);
  registerSlotCommands(program);
  registerSlotMgmtCommands(program);
  registerTaskCommands(program);
  registerProjectCommands(program);
  registerLabelCommands(program);
  registerLogCommands(program);

  program
    .command("migrate")
    .description("Apply all pending database migrations")
    .action(async () => {
      const url = deps.databaseUrl();
      if (!url) throw new Error("DATABASE_URL is not set");
      await deps.migrate(url);
      deps.log("Migrations applied");
    });

  // The database connects on the first query; closing is a no-op without it.
  program.hook("postAction", () => deps.close());

  return program;
}
