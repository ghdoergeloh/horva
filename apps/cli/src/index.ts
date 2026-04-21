#!/usr/bin/env node
import { Command } from "commander";

import { registerInitCommand } from "./commands/init.js";
import { registerLabelCommands } from "./commands/label.js";
import { registerLogCommands } from "./commands/log.js";
import { registerProjectCommands } from "./commands/project.js";
import { registerSlotCommands } from "./commands/slot.js";
import { registerSlotMgmtCommands } from "./commands/slotMgmt.js";
import { registerTaskCommands } from "./commands/task.js";

const program = new Command();

program.name("horva").description("Horva time tracking CLI").version("0.1.0");

registerInitCommand(program);
registerSlotCommands(program);
registerSlotMgmtCommands(program);
registerTaskCommands(program);
registerProjectCommands(program);
registerLabelCommands(program);
registerLogCommands(program);

await program.parseAsync(process.argv);

// Don't import db for init — it may not be configured yet
const isInit = process.argv[2] === "init";
if (!isInit) {
  const { db } = await import("./lib/db");
  await db.close();
}
