import type { Command } from "commander";
import { select } from "@inquirer/prompts";
import chalk from "chalk";

import { createLabel, deleteLabel, listLabels } from "@repo/core";

import { db } from "../lib/db";
import { printError, printSuccess, sym } from "../lib/display";

export function registerLabelCommands(program: Command): void {
  const labelCmd = program
    .command("label")
    .alias("l")
    .description("Manage labels");

  // label new
  labelCmd
    .command("new [name]")
    .description("Create a new label")
    .action(async (name: string | undefined) => {
      try {
        let labelName = name;
        if (!labelName) {
          const { input } = await import("@inquirer/prompts");
          labelName = await input({ message: "Label name:" });
        }
        const l = await createLabel(db, labelName);
        printSuccess(`${sym.created} Label "${l.name}" created`);
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // label list
  labelCmd
    .command("list")
    .alias("ls")
    .description("List all labels")
    .action(async () => {
      try {
        const labels = await listLabels(db);
        if (labels.length === 0) {
          console.log("  No labels found.");
          return;
        }
        console.log(chalk.dim(`  ${"Label".padEnd(20)} ID`));
        for (const l of labels) {
          console.log(`  ${l.name.padEnd(20)} #${l.id}`);
        }
        console.log(chalk.dim(`\n  ${labels.length} label(s)`));
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // label delete
  labelCmd
    .command("delete <id>")
    .alias("rm")
    .description("Delete a label")
    .action(async (idStr: string) => {
      try {
        const id = parseInt(idStr.replace(/^#/, ""), 10);
        if (isNaN(id)) {
          printError(`Invalid ID: ${idStr}`);
          process.exit(1);
        }

        const labels = await listLabels(db);
        const existing = labels.find((l) => l.id === id);
        if (!existing) {
          printError(`Label #${id} not found`);
          process.exit(1);
        }

        console.log(
          `${sym.warning} This will delete the label "${existing.name}". It will be removed from all associated tasks.`,
        );
        const confirmed = await select({
          message: "Are you sure?",
          choices: [
            { name: "No", value: false },
            { name: "Yes", value: true },
          ],
        });
        if (!confirmed) {
          console.log("Cancelled.");
          return;
        }

        const result = await deleteLabel(db, id);
        printSuccess(
          `${sym.deleted} Label "${existing.name}" deleted.${result.affectedTasks > 0 ? ` Removed from ${result.affectedTasks} task(s).` : ""}`,
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });
}
