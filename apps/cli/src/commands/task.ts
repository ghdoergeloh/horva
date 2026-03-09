import type { Command } from "commander";
import { checkbox, input, select } from "@inquirer/prompts";
import chalk from "chalk";

import {
  archiveTask,
  createLabel,
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

import { db } from "../lib/db.js";
import {
  colorProject,
  formatDate,
  printError,
  printSuccess,
  sym,
} from "../lib/display.js";
import { askChange, pickProject, pickTask } from "../lib/pickers.js";

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
    .option("--activity", "Create as activity instead of task")
    .action(
      async (
        name: string | undefined,
        opts: {
          project?: string;
          label: string[];
          date?: string;
          note?: string;
          link: string[];
          activity?: boolean;
        },
      ) => {
        try {
          let taskName = name;
          taskName ??= await input({ message: "Task name:" });

          let projectId: number | undefined;
          if (opts.project) {
            projectId = parseInt(opts.project, 10);
          } else {
            projectId = await pickProject(db, "Project:");
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

          const taskType = opts.activity ? "activity" : "task";
          const scheduledDate = opts.activity
            ? undefined
            : opts.date
              ? parseDate(opts.date)
              : undefined;

          const created = await createTask(db, {
            name: taskName,
            projectId,
            taskType,
            labelIds: labelIds.length > 0 ? labelIds : undefined,
            scheduledDate,
            notes: opts.note ?? undefined,
            links: opts.link.length > 0 ? opts.link : [],
          });

          const typeLabel = taskType === "activity" ? "Activity" : "Task";
          printSuccess(
            `${sym.created} ${typeLabel} #${created.id} "${created.name}" created`,
          );

          const full = await getTask(db, created.id);
          if (full) {
            const labelNames = full.taskLabels.map((tl) => tl.label.name);
            const details = [
              `Project: ${colorProject(full.project.name, full.project.color)}`,
              `Type: ${taskType}`,
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
    .option("--activities", "Show only activities")
    .option("--tasks-only", "Show only tasks (no activities)")
    .action(
      async (
        _filter: string | undefined,
        opts: {
          project?: string;
          label?: string;
          all?: boolean;
          done?: boolean;
          archived?: boolean;
          activities?: boolean;
          tasksOnly?: boolean;
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

          const projectId = opts.project
            ? parseInt(opts.project, 10)
            : undefined;

          const printHeader = () =>
            console.log(
              chalk.dim(
                `  ${"#".padEnd(5)} ${"Task".padEnd(30)} ${"Project".padEnd(15)} ${"Labels".padEnd(15)} Planned`,
              ),
            );

          const printRow = (
            t: Awaited<ReturnType<typeof listTasks>>[number],
          ) => {
            const labelNames = t.taskLabels.map((tl) => tl.label.name);
            const planned = t.scheduledDate ? formatDate(t.scheduledDate) : "";
            console.log(
              `  ${String(t.id).padEnd(5)} ${t.name.substring(0, 29).padEnd(30)} ${colorProject(t.project.name.substring(0, 14), t.project.color).padEnd(15)} ${labelNames.join(", ").substring(0, 14).padEnd(15)} ${planned}`,
            );
          };

          if (opts.activities) {
            const tasks = await listTasks(db, {
              projectId,
              status,
              includeStatuses,
              taskType: "activity",
            });
            if (tasks.length === 0) {
              console.log("  No activities found.");
              return;
            }
            printHeader();
            for (const t of tasks) printRow(t);
            console.log(
              chalk.dim(
                `\n  ${tasks.length} activit${tasks.length === 1 ? "y" : "ies"}`,
              ),
            );
            return;
          }

          if (opts.tasksOnly) {
            const tasks = await listTasks(db, {
              projectId,
              status,
              includeStatuses,
              taskType: "task",
            });
            if (tasks.length === 0) {
              console.log("  No tasks found.");
              return;
            }
            printHeader();
            for (const t of tasks) printRow(t);
            console.log(chalk.dim(`\n  ${tasks.length} task(s)`));
            return;
          }

          // Default: grouped output — activities then tasks
          const allTasks = await listTasks(db, {
            projectId,
            status,
            includeStatuses,
          });

          if (allTasks.length === 0) {
            console.log("  No tasks found.");
            return;
          }

          const activities = allTasks.filter((t) => t.taskType === "activity");
          const regularTasks = allTasks.filter((t) => t.taskType === "task");

          if (activities.length > 0) {
            console.log(chalk.bold("  Activities:"));
            printHeader();
            for (const t of activities) printRow(t);
            console.log();
          }

          if (regularTasks.length > 0) {
            console.log(chalk.bold("  Tasks:"));
            printHeader();
            const openTasks = regularTasks.filter((t) => t.status === "open");
            const doneTasks = regularTasks.filter((t) => t.status !== "open");
            for (const t of openTasks) printRow(t);
            if (doneTasks.length > 0 && !opts.all) {
              console.log(
                chalk.dim(
                  `  ... ${doneTasks.length} more done/archived – use --all to show`,
                ),
              );
            } else {
              for (const t of doneTasks) printRow(t);
            }
          }

          const openCount = regularTasks.filter(
            (t) => t.status === "open",
          ).length;
          const doneCount = regularTasks.filter(
            (t) => t.status !== "open",
          ).length;
          const actCount = activities.length;
          const summary: string[] = [];
          if (actCount > 0)
            summary.push(`${actCount} activit${actCount === 1 ? "y" : "ies"}`);
          if (openCount > 0 || doneCount > 0) {
            let taskSummary = `${openCount} open task${openCount === 1 ? "" : "s"}`;
            if (doneCount > 0 && !opts.all)
              taskSummary += ` (${doneCount} more done – use --all to show)`;
            summary.push(taskSummary);
          }
          console.log(chalk.dim(`\n  ${summary.join(", ")}`));
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // task edit
  taskCmd
    .command("edit [id]")
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
    .option("--type <type>", "Convert task type (task|activity)")
    .action(
      async (
        idStr: string | undefined,
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
          type?: string;
        },
      ) => {
        try {
          const allLabels = await listLabels(db);
          const resolveLabels = (names: string[]) =>
            names
              .map(
                (n) =>
                  allLabels.find(
                    (l) => l.name.toLowerCase() === n.toLowerCase(),
                  )?.id,
              )
              .filter((labelId): labelId is number => labelId !== undefined);

          const hasFlags =
            opts.name !== undefined ||
            opts.project !== undefined ||
            opts.label.length > 0 ||
            opts.removeLabel.length > 0 ||
            opts.date !== undefined ||
            opts.clearDate === true ||
            opts.note !== undefined ||
            opts.link.length > 0 ||
            opts.removeLink.length > 0 ||
            opts.type !== undefined;

          // Resolve ID (interactively if not provided)
          let id: number;
          if (idStr !== undefined) {
            id = parseId(idStr);
          } else {
            const picked = await pickTask(
              db,
              "Which task do you want to edit?",
            );
            if (picked === null) {
              console.log("Cancelled.");
              return;
            }
            id = picked;
          }

          if (hasFlags) {
            // Non-interactive path
            let scheduledDate: Date | null | undefined;
            if (opts.clearDate) {
              scheduledDate = null;
            } else if (opts.date) {
              scheduledDate = parseDate(opts.date);
            }

            let taskType: "task" | "activity" | undefined;
            if (opts.type !== undefined) {
              if (opts.type !== "task" && opts.type !== "activity") {
                printError(
                  `Invalid type "${opts.type}". Use "task" or "activity".`,
                );
                process.exit(1);
              }
              taskType = opts.type;
            }

            // Fetch current task to show conversion message
            const currentForEdit =
              taskType !== undefined ? await getTask(db, id) : undefined;

            await updateTask(db, id, {
              name: opts.name,
              projectId: opts.project ? parseInt(opts.project, 10) : undefined,
              taskType,
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

            if (taskType !== undefined && currentForEdit) {
              const from = currentForEdit.taskType;
              printSuccess(
                `${sym.edited} Task #${id} converted: ${from} → ${taskType}`,
              );
            } else {
              printSuccess(`${sym.edited} Task #${id} updated`);
            }
            return;
          }

          // Interactive wizard
          const current = await getTask(db, id);
          if (!current) {
            printError(`Task #${id} not found`);
            process.exit(1);
          }

          const changes: Parameters<typeof updateTask>[2] = {};

          // name
          const newName = await input({
            message: "Name:",
            default: current.name,
          });
          if (newName !== current.name) changes.name = newName;

          // project
          const projects = await listProjects(db);
          const projectChoices = projects.map((p) => ({
            name: `#${p.id} ${colorProject(p.name, p.color)}`,
            value: p.id,
          }));
          const newProjectId = await select({
            message: "Project:",
            choices: projectChoices,
            default: current.project.id,
          });
          if (newProjectId !== current.project.id)
            changes.projectId = newProjectId;

          // scheduledDate
          const currentDateDisplay = current.scheduledDate
            ? formatDate(current.scheduledDate)
            : null;
          const dateAction = await askChange(
            "Scheduled date:",
            currentDateDisplay,
            {
              canRemove: current.scheduledDate !== null,
              removeLabel: "Remove (clear date)",
            },
          );
          if (dateAction === "remove") {
            changes.scheduledDate = null;
          } else if (dateAction === "change") {
            const newDateStr = await input({
              message: "New date (today, tomorrow, YYYY-MM-DD):",
            });
            changes.scheduledDate = parseDate(newDateStr);
          }

          // notes
          const notesAction = await askChange("Notes:", current.notes ?? null, {
            canRemove: current.notes !== null,
            removeLabel: "Remove (clear notes)",
          });
          if (notesAction === "remove") {
            changes.notes = null;
          } else if (notesAction === "change") {
            changes.notes = await input({
              message: "New notes:",
              default: current.notes ?? undefined,
            });
          }

          // labels
          const currentLabelIds = new Set(
            current.taskLabels.map((tl) => tl.label.id),
          );
          const labelChoices: {
            name: string;
            value: number;
            checked: boolean;
          }[] = allLabels.map((l) => ({
            name: l.name,
            value: l.id,
            checked: currentLabelIds.has(l.id),
          }));
          labelChoices.push({
            name: "Create new label...",
            value: -1,
            checked: false,
          });

          {
            const selectedRaw = await checkbox({
              message: "Labels (space to toggle):",
              choices: labelChoices,
            });

            const selectedLabelIds = selectedRaw.filter((id) => id !== -1);
            if (selectedRaw.includes(-1)) {
              const newLabelName = await input({ message: "New label name:" });
              const newLabel = await createLabel(db, newLabelName);
              selectedLabelIds.push(newLabel.id);
            }

            const selectedSet = new Set(selectedLabelIds);
            const toAdd = selectedLabelIds.filter(
              (lid) => !currentLabelIds.has(lid),
            );
            const toRemove = [...currentLabelIds].filter(
              (lid) => !selectedSet.has(lid),
            );
            if (toAdd.length > 0) changes.addLabelIds = toAdd;
            if (toRemove.length > 0) changes.removeLabelIds = toRemove;
          }

          if (Object.keys(changes).length === 0) {
            console.log("No changes made.");
            return;
          }

          await updateTask(db, id, changes);
          printSuccess(`${sym.edited} Task #${id} updated`);
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // task done
  taskCmd
    .command("done [id]")
    .description("Mark task as done")
    .action(async (idStr?: string) => {
      try {
        let id: number;
        if (idStr) {
          id = parseId(idStr);
        } else {
          const picked = await pickTask(
            db,
            "Which task do you want to mark as done?",
          );
          if (!picked) {
            printError("No task selected.");
            process.exit(1);
          }
          id = picked;
        }
        const existing = await getTask(db, id);
        if (!existing) {
          printError(`Task #${id} not found`);
          process.exit(1);
        }
        if (existing.taskType === "activity") {
          console.log(
            `${sym.warning} "${existing.name}" is an activity and cannot be marked as done.`,
          );
          console.log(
            `  Use "tt task archive #${id}" to hide it, or "tt task edit #${id} --type task" to convert it.`,
          );
          process.exit(1);
        }
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

          const existing = await getTask(db, id);
          if (!existing) {
            printError(`Task #${id} not found`);
            process.exit(1);
          }
          if (existing.taskType === "activity") {
            console.log(
              `${sym.warning} "${existing.name}" is an activity and cannot be planned.`,
            );
            console.log(
              `  Use "tt task edit #${id} --type task" to convert it to a task first.`,
            );
            process.exit(1);
          }

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
          const timeStr = opts.time ? ` at ${opts.time}` : "";
          printSuccess(
            `${sym.planned} Task #${t.id} "${existing.name}" planned for ${formatDate(date)}${timeStr}`,
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
