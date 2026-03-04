import type { Command } from "commander";
import { input, select } from "@inquirer/prompts";
import chalk from "chalk";

import {
  archiveTask,
  createTask,
  deleteTask,
  getTask,
  listLabels,
  listProjects,
  listTasks,
  markTaskDone,
  planTask,
  reopenTask,
  updateTask,
} from "@repo/core";

import { db } from "../lib/db";
import {
  colorProject,
  formatDate,
  printError,
  printSuccess,
  sym,
} from "../lib/display";

function parseId(ref: string): number {
  const id = parseInt(ref.replace(/^#/, ""), 10);
  if (isNaN(id)) throw new Error(`Invalid ID: ${ref}`);
  return id;
}

function parseDate(str: string): Date {
  const lower = str.toLowerCase().trim();
  const now = new Date();
  if (lower === "today") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (lower === "tomorrow") {
    now.setDate(now.getDate() + 1);
    now.setHours(0, 0, 0, 0);
    return now;
  }
  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) throw new Error(`Invalid date: ${str}`);
  return parsed;
}

export function registerTaskCommands(program: Command): void {
  const taskCmd = program
    .command("task")
    .alias("t")
    .description("Manage tasks");

  // task new
  taskCmd
    .command("new [name]")
    .description("Create a new task")
    .option("-p, --project <id>", "Project ID or name")
    .option("-l, --label <name>", "Label name (repeatable)", collect, [])
    .option("-d, --date <date>", "Scheduled date (today, tomorrow, YYYY-MM-DD)")
    .option("-n, --note <text>", "Add a note")
    .option("--link <url>", "Add a link (repeatable)", collect, [])
    .action(
      async (
        name: string | undefined,
        opts: {
          project?: string;
          label: string[];
          date?: string;
          note?: string;
          link: string[];
        },
      ) => {
        try {
          let taskName = name;
          taskName ??= await input({ message: "Task name:" });

          let projectId: number | undefined;
          if (opts.project) {
            projectId = parseInt(opts.project, 10);
          } else {
            const projects = await listProjects(db);
            const choices = projects.map((p) => ({
              name: `#${p.id} ${colorProject(p.name, p.color)}`,
              value: p.id,
            }));
            projectId = await select({
              message: "Project:",
              choices,
            });
          }

          // Resolve label IDs
          const allLabels = await listLabels(db);
          const labelIds: number[] = [];
          for (const labelName of opts.label) {
            const found = allLabels.find(
              (l) => l.name.toLowerCase() === labelName.toLowerCase(),
            );
            if (found) labelIds.push(found.id);
          }

          const scheduledDate = opts.date ? parseDate(opts.date) : undefined;

          const created = await createTask(db, {
            name: taskName,
            projectId,
            labelIds: labelIds.length > 0 ? labelIds : undefined,
            scheduledDate,
            notes: opts.note ?? undefined,
            links: opts.link.length > 0 ? opts.link : [],
          });

          printSuccess(
            `${sym.created} Task #${created.id} "${created.name}" created`,
          );

          const full = await getTask(db, created.id);
          if (full) {
            const labelNames = full.taskLabels.map((tl) => tl.label.name);
            const details = [
              `Project: ${colorProject(full.project.name, full.project.color)}`,
              labelNames.length > 0 ? `Labels: ${labelNames.join(", ")}` : null,
              scheduledDate ? `Planned: ${formatDate(scheduledDate)}` : null,
            ]
              .filter(Boolean)
              .join(" | ");
            if (details) console.log(`  ${details}`);
          }
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // task list
  taskCmd
    .command("list [filter]")
    .alias("ls")
    .description("List tasks")
    .option("-p, --project <id>", "Filter by project ID")
    .option("-l, --label <name>", "Filter by label")
    .option("--all", "Include done tasks")
    .option("--done", "Show only done tasks")
    .option("--archived", "Show archived tasks")
    .action(
      async (
        _filter: string | undefined,
        opts: {
          project?: string;
          label?: string;
          all?: boolean;
          done?: boolean;
          archived?: boolean;
        },
      ) => {
        try {
          let status: "open" | "done" | "archived" | undefined;
          let includeStatuses:
            | ("open" | "done" | "archived" | "deleted")[]
            | undefined;

          if (opts.done) {
            status = "done";
          } else if (opts.archived) {
            status = "archived";
          } else if (opts.all) {
            includeStatuses = ["open", "done", "archived"];
          }

          const tasks = await listTasks(db, {
            projectId: opts.project ? parseInt(opts.project, 10) : undefined,
            status,
            includeStatuses,
          });

          if (tasks.length === 0) {
            console.log("  No tasks found.");
            return;
          }

          console.log(
            chalk.dim(
              `  ${"#".padEnd(5)} ${"Task".padEnd(30)} ${"Project".padEnd(15)} ${"Labels".padEnd(15)} Planned`,
            ),
          );
          for (const t of tasks) {
            const labelNames = t.taskLabels.map((tl) => tl.label.name);
            const planned = t.scheduledDate ? formatDate(t.scheduledDate) : "";
            console.log(
              `  ${String(t.id).padEnd(5)} ${t.name.substring(0, 29).padEnd(30)} ${colorProject(t.project.name.substring(0, 14), t.project.color).padEnd(15)} ${labelNames.join(", ").substring(0, 14).padEnd(15)} ${planned}`,
            );
          }
          console.log(chalk.dim(`\n  ${tasks.length} task(s)`));
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // task edit
  taskCmd
    .command("edit <id>")
    .description("Edit a task")
    .option("-n, --name <name>", "New name")
    .option("-p, --project <id>", "New project ID")
    .option("-l, --label <name>", "Add label (repeatable)", collect, [])
    .option("--remove-label <name>", "Remove label (repeatable)", collect, [])
    .option("-d, --date <date>", "Set scheduled date")
    .option("--clear-date", "Remove scheduled date")
    .option("--note <text>", "Set/replace note")
    .option("--link <url>", "Add link (repeatable)", collect, [])
    .option("--remove-link <url>", "Remove link (repeatable)", collect, [])
    .action(
      async (
        idStr: string,
        opts: {
          name?: string;
          project?: string;
          label: string[];
          removeLabel: string[];
          date?: string;
          clearDate?: boolean;
          note?: string;
          link: string[];
          removeLink: string[];
        },
      ) => {
        try {
          const id = parseId(idStr);

          const allLabels = await listLabels(db);
          const resolveLabels = (names: string[]) =>
            names
              .map(
                (n) =>
                  allLabels.find(
                    (l) => l.name.toLowerCase() === n.toLowerCase(),
                  )?.id,
              )
              .filter((id): id is number => id !== undefined);

          let scheduledDate: Date | null | undefined;
          if (opts.clearDate) {
            scheduledDate = null;
          } else if (opts.date) {
            scheduledDate = parseDate(opts.date);
          }

          await updateTask(db, id, {
            name: opts.name,
            projectId: opts.project ? parseInt(opts.project, 10) : undefined,
            addLabelIds:
              opts.label.length > 0 ? resolveLabels(opts.label) : undefined,
            removeLabelIds:
              opts.removeLabel.length > 0
                ? resolveLabels(opts.removeLabel)
                : undefined,
            scheduledDate,
            notes: opts.note,
            addLinks: opts.link.length > 0 ? opts.link : undefined,
            removeLinks:
              opts.removeLink.length > 0 ? opts.removeLink : undefined,
          });

          printSuccess(`${sym.edited} Task #${id} updated`);
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // task done
  taskCmd
    .command("done <id>")
    .description("Mark task as done")
    .action(async (idStr: string) => {
      try {
        const id = parseId(idStr);
        const t = await markTaskDone(db, id);
        printSuccess(
          `${sym.checked} Task #${t.id} "${t.name}" marked as done.`,
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // task reopen
  taskCmd
    .command("reopen <id>")
    .description("Reopen a done task")
    .action(async (idStr: string) => {
      try {
        const id = parseId(idStr);
        const t = await reopenTask(db, id);
        printSuccess(`${sym.reopen} Task #${t.id} "${t.name}" reopened.`);
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // task archive
  taskCmd
    .command("archive <id>")
    .alias("arch")
    .description("Archive a task")
    .action(async (idStr: string) => {
      try {
        const id = parseId(idStr);
        const t = await archiveTask(db, id);
        printSuccess(`${sym.archived} Task #${t.id} "${t.name}" archived.`);
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // task delete
  taskCmd
    .command("delete <id>")
    .alias("rm")
    .description("Delete a task permanently")
    .action(async (idStr: string) => {
      try {
        const id = parseId(idStr);
        const existing = await getTask(db, id);
        if (!existing) {
          printError(`Task #${id} not found`);
          process.exit(1);
        }

        const slotCount = existing.slots.length;
        console.log(
          `${sym.warning} This will permanently delete task #${id} "${existing.name}".`,
        );
        if (slotCount > 0) {
          console.log(
            `  ${slotCount} slot(s) are linked to this task and will be marked as "task deleted".`,
          );
        }

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

        const result = await deleteTask(db, id);
        printSuccess(
          `${sym.deleted} Task #${id} "${existing.name}" deleted.${result.affectedSlots > 0 ? ` ${result.affectedSlots} slots updated.` : ""}`,
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // task plan
  taskCmd
    .command("plan <id> [date]")
    .description("Plan a task for a date")
    .option("-t, --time <time>", "Set time (HH:MM)")
    .option("--clear", "Remove planning")
    .action(
      async (
        idStr: string,
        dateStr: string | undefined,
        opts: { time?: string; clear?: boolean },
      ) => {
        try {
          const id = parseId(idStr);

          if (opts.clear) {
            const t = await planTask(db, id, null);
            printSuccess(`${sym.planned} Task #${t.id} – planning removed.`);
            return;
          }

          if (!dateStr) {
            printError("Date required (or use --clear)");
            process.exit(1);
          }

          const date = parseDate(dateStr);
          if (opts.time) {
            const [h, m] = opts.time.split(":").map(Number);
            date.setHours(h ?? 0, m ?? 0, 0, 0);
          }

          const t = await planTask(db, id, date);
          const existing = await getTask(db, t.id);
          const timeStr = opts.time ? ` at ${opts.time}` : "";
          printSuccess(
            `${sym.planned} Task #${t.id} "${existing?.name}" planned for ${formatDate(date)}${timeStr}`,
          );
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );
}

function collect(val: string, prev: string[]): string[] {
  return [...prev, val];
}
