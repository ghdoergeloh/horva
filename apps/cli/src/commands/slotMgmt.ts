import type { Command } from "commander";
import { confirm, input, select } from "@inquirer/prompts";
import chalk from "chalk";

import {
  deleteSlot,
  editSlot,
  getOpenSlot,
  getSlot,
  listSlots,
  splitSlot,
} from "@repo/core";

import { db } from "../lib/db.js";
import {
  colorProject,
  formatDate,
  formatDuration,
  formatTime,
  padVisible,
  printError,
  sym,
} from "../lib/display.js";
import { askChange, pickSlot, pickTask } from "../lib/pickers.js";

function parseTime(timeStr: string, referenceDate?: Date): Date {
  const base = referenceDate ? new Date(referenceDate) : new Date();
  const parts = timeStr.trim().split(/\s+/);
  // If two parts, second is a date like "2026-02-19"
  if (parts.length === 2 && parts[1]) {
    const dateParts = parts[1].split("-").map(Number);
    base.setFullYear(dateParts[0] ?? base.getFullYear());
    base.setMonth((dateParts[1] ?? base.getMonth() + 1) - 1);
    base.setDate(dateParts[2] ?? base.getDate());
  }
  const [h, m] = (parts[0] ?? "").split(":").map(Number);
  base.setHours(h ?? 0, m ?? 0, 0, 0);
  return base;
}

function getPeriodRange(period: string): { from: Date; to: Date } {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  if (!period || period === "today") {
    return { from: today, to: todayEnd };
  }
  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    const ye = new Date(y);
    ye.setHours(23, 59, 59, 999);
    return { from: y, to: ye };
  }
  // Range: 2026-02-10..2026-02-15
  if (period.includes("..")) {
    const [fromStr, toStr] = period.split("..");
    const from = new Date(fromStr ?? "");
    from.setHours(0, 0, 0, 0);
    const to = new Date(toStr ?? "");
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
  // Specific date: 2026-02-19
  const specific = new Date(period);
  if (!isNaN(specific.getTime())) {
    specific.setHours(0, 0, 0, 0);
    const end = new Date(specific);
    end.setHours(23, 59, 59, 999);
    return { from: specific, to: end };
  }
  return { from: today, to: todayEnd };
}

function slotDuration(s: { startedAt: Date; endedAt: Date | null }): number {
  if (!s.endedAt) return 0;
  return Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000);
}

function formatSlotRow(
  s: {
    id: number;
    startedAt: Date;
    endedAt: Date | null;
    task: {
      id: number;
      name: string;
      project: { name: string; color: string };
    } | null;
  },
  showDate = false,
): string {
  const from = formatTime(s.startedAt);
  const to = s.endedAt ? formatTime(s.endedAt) : ` ${sym.start}`;
  const dur = s.endedAt ? formatDuration(slotDuration(s)) : "  ...";
  const idStr = String(s.id).padStart(4);
  const dateStr = showDate ? `${formatDate(s.startedAt)} ` : "";

  let taskInfo = "-";
  let projInfo = "";
  if (s.task) {
    taskInfo = `#${s.task.id} ${s.task.name}`;
    projInfo = colorProject(s.task.project.name, s.task.project.color);
  }

  return `  ${idStr}  ${dateStr}${from} - ${to.padEnd(5)} | ${dur.padStart(5)} | ${padVisible(taskInfo.substring(0, 28).padEnd(28), 28)} | ${projInfo}`;
}

export function registerSlotMgmtCommands(program: Command): void {
  const slotCmd = program
    .command("slot")
    .alias("sl")
    .description("Manage time slots");

  // tt slot list [period]
  slotCmd
    .command("list [period]")
    .alias("ls")
    .description("List slots for a time period")
    .option("-p, --project <id>", "Filter by project ID")
    .option("--tasks-only", "Only show slots with a task")
    .action(
      async (
        period: string | undefined,
        opts: { project?: string; tasksOnly?: boolean },
      ) => {
        try {
          const { from, to } = getPeriodRange(period ?? "today");
          const projectId = opts.project
            ? parseInt(opts.project, 10)
            : undefined;

          const slots = await listSlots(db, {
            from,
            to,
            projectId,
            tasksOnly: opts.tasksOnly,
          });

          // Group by date
          const byDate = new Map<string, typeof slots>();
          for (const s of slots) {
            const key = s.startedAt.toDateString();
            const group = byDate.get(key) ?? [];
            group.push(s);
            byDate.set(key, group);
          }

          const multiDay = byDate.size > 1;

          if (slots.length === 0) {
            console.log("  No slots found.");
            return;
          }

          for (const [, daySlots] of byDate) {
            const firstSlot = daySlots[0];
            if (!firstSlot) continue;
            const dateLabel = firstSlot.startedAt.toLocaleDateString("en", {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            });
            console.log(`\n  ${chalk.bold(dateLabel)}`);
            console.log(
              chalk.dim(
                `  ${"ID".padStart(4)}  ${"From"} - ${"To".padEnd(5)} | ${"Time".padStart(5)} | ${"Task".padEnd(28)} | Project`,
              ),
            );

            let breaks = 0;
            for (let i = 0; i < daySlots.length; i++) {
              const s = daySlots[i];
              if (!s) continue;
              console.log(formatSlotRow(s, multiDay));

              // Show break if there's a gap to next slot
              const next = daySlots[i + 1];
              if (next && s.endedAt && next.startedAt > s.endedAt) {
                const gapMins = Math.round(
                  (next.startedAt.getTime() - s.endedAt.getTime()) / 60000,
                );
                console.log(
                  chalk.dim(
                    `         -- break ${formatTime(s.endedAt)} - ${formatTime(next.startedAt)} (${formatDuration(gapMins)}) --`,
                  ),
                );
                breaks++;
              }
            }

            const totalMins = daySlots.reduce(
              (sum, s) => sum + slotDuration(s),
              0,
            );
            console.log(
              chalk.dim(
                `\n  ${daySlots.length} slot${daySlots.length !== 1 ? "s" : ""}${breaks > 0 ? `, ${breaks} break${breaks !== 1 ? "s" : ""}` : ""}, ${formatDuration(totalMins)} total`,
              ),
            );
          }
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // tt slot edit [id]
  slotCmd
    .command("edit [id]")
    .description("Edit a slot's times or task")
    .option("-s, --start <time>", "New start time (HH:MM or HH:MM YYYY-MM-DD)")
    .option("-e, --end <time>", "New end time (HH:MM or HH:MM YYYY-MM-DD)")
    .option("-t, --task <taskId>", "Assign task (use task ID, e.g. #34 or 34)")
    .option("--no-task", "Remove task assignment")
    .option("--reopen", "Reopen slot by removing its end time")
    .action(
      async (
        idStr: string | undefined,
        opts: {
          start?: string;
          end?: string;
          task?: string;
          noTask?: boolean;
          reopen?: boolean;
        },
      ) => {
        try {
          const hasFlags =
            opts.start !== undefined ||
            opts.end !== undefined ||
            opts.task !== undefined ||
            opts.noTask === true ||
            opts.reopen === true;

          let current: Awaited<ReturnType<typeof getSlot>>;
          if (idStr !== undefined) {
            const id = parseInt(idStr, 10);
            if (isNaN(id)) {
              printError(`Invalid slot ID: ${idStr}`);
              process.exit(1);
            }
            current = await getSlot(db, id);
            if (!current) {
              printError(`Slot #${id} not found`);
              process.exit(1);
            }
          } else {
            current = await pickSlot(db, "Which slot do you want to edit?");
          }

          const id = current.id;

          const changes: {
            startedAt?: Date;
            endedAt?: Date | null;
            taskId?: number | null;
          } = {};

          if (hasFlags) {
            // Non-interactive flag path
            if (opts.start) {
              changes.startedAt = parseTime(opts.start, current.startedAt);
            }
            if (opts.reopen) {
              if (!current.endedAt) {
                printError("Slot is already open.");
                process.exit(1);
              }
              const openSlot = await getOpenSlot(db);
              if (openSlot) {
                printError(
                  `Cannot reopen slot #${current.id}: slot #${openSlot.id} is already open. Close it first.`,
                );
                process.exit(1);
              }
              changes.endedAt = null;
            } else if (opts.end) {
              changes.endedAt = parseTime(opts.end, current.startedAt);
            }
            if (opts.noTask) {
              changes.taskId = null;
            } else if (opts.task) {
              const taskId = parseInt(opts.task.replace(/^#/, ""), 10);
              if (isNaN(taskId)) {
                printError(`Invalid task ID: ${opts.task}`);
                process.exit(1);
              }
              changes.taskId = taskId;
            }
          } else {
            // Interactive wizard
            // startedAt
            const startAction = await askChange(
              "Start time:",
              formatTime(current.startedAt),
            );
            if (startAction === "change") {
              const newStartStr = await input({
                message: "New start time (HH:MM or HH:MM YYYY-MM-DD):",
              });
              changes.startedAt = parseTime(newStartStr, current.startedAt);
            }

            // endedAt
            const endCurrentDisplay = current.endedAt
              ? formatTime(current.endedAt)
              : null;
            const endAction = await askChange("End time:", endCurrentDisplay, {
              canRemove: current.endedAt !== null,
              removeLabel: "Remove (reopen slot)",
            });
            if (endAction === "remove") {
              const openSlot = await getOpenSlot(db);
              if (openSlot && openSlot.id !== current.id) {
                printError(
                  `Cannot reopen slot #${current.id}: slot #${openSlot.id} is already open. Close it first.`,
                );
                process.exit(1);
              }
              changes.endedAt = null;
            } else if (endAction === "change") {
              const newEndStr = await input({
                message: "New end time (HH:MM or HH:MM YYYY-MM-DD):",
              });
              changes.endedAt = parseTime(newEndStr, current.startedAt);
            }

            // task
            const taskCurrentDisplay = current.task
              ? `#${current.task.id} ${current.task.name}`
              : null;
            const taskAction = await askChange("Task:", taskCurrentDisplay, {
              canRemove: current.task !== null,
              removeLabel: "Remove (no task)",
            });
            if (taskAction === "remove") {
              changes.taskId = null;
            } else if (taskAction === "change") {
              const newTaskId = await pickTask(db, "Select task:", {
                allowNone: false,
              });
              if (newTaskId !== null) changes.taskId = newTaskId;
            }
          }

          if (Object.keys(changes).length === 0) {
            console.log("No changes made.");
            return;
          }

          // Check for neighbor impact before applying
          let adjustNeighbor = false;

          if (changes.endedAt !== undefined && changes.endedAt !== null) {
            const newEnd = changes.endedAt;
            // Get all slots for the day to find the next one
            const startOfDay = new Date(current.startedAt);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(current.startedAt);
            endOfDay.setHours(23, 59, 59, 999);

            const daySlots = await listSlots(db, {
              from: startOfDay,
              to: endOfDay,
            });
            const currentIdx = daySlots.findIndex((s) => s.id === id);
            const nextSlot =
              currentIdx >= 0 ? daySlots[currentIdx + 1] : undefined;

            if (nextSlot) {
              const currentEnd = current.endedAt;
              const nextStart = nextSlot.startedAt;

              if (newEnd > nextStart) {
                // Overlap
                console.log(
                  `${sym.warning} Changing end of slot #${id} to ${formatTime(newEnd)} would overlap with slot #${nextSlot.id}.`,
                );
                console.log(
                  `  Slot #${nextSlot.id} currently starts at ${formatTime(nextStart)}.`,
                );
                console.log();
                console.log("  Suggested adjustment:");
                const taskStr = current.task
                  ? `  #${current.task.id} ${current.task.name}`
                  : "  (no task)";
                const nextTaskStr = nextSlot.task
                  ? `  #${nextSlot.task.id} ${nextSlot.task.name}`
                  : "  (no task)";
                console.log(
                  `    Slot #${id}: ${formatTime(current.startedAt)} - ${formatTime(newEnd)}  (was ${formatTime(current.startedAt)} - ${currentEnd ? formatTime(currentEnd) : "open"})${taskStr}`,
                );
                console.log(
                  `    Slot #${nextSlot.id}: ${formatTime(newEnd)} - ${nextSlot.endedAt ? formatTime(nextSlot.endedAt) : "open"}  (was ${formatTime(nextStart)} - ${nextSlot.endedAt ? formatTime(nextSlot.endedAt) : "open"})${nextTaskStr}`,
                );
                console.log();

                adjustNeighbor = await confirm({
                  message: `Apply adjustment to slot #${nextSlot.id}?`,
                  default: false,
                });
                if (!adjustNeighbor) {
                  console.log("Aborted.");
                  return;
                }
              } else if (
                currentEnd !== null &&
                newEnd < nextStart &&
                currentEnd.getTime() === nextStart.getTime()
              ) {
                // Was adjacent, now creating a gap
                const gapMins = Math.round(
                  (nextStart.getTime() - newEnd.getTime()) / 60000,
                );
                console.log(
                  `${sym.warning} Changing end of slot #${id} to ${formatTime(newEnd)} would create a gap before slot #${nextSlot.id}.`,
                );
                console.log(
                  `  Slot #${nextSlot.id} currently starts at ${formatTime(nextStart)}.`,
                );
                console.log();
                console.log("  Options:");
                console.log(
                  `    [1] Keep gap (${formatTime(newEnd)} - ${formatTime(nextStart)}, ${formatDuration(gapMins)} break)`,
                );
                console.log(
                  `    [2] Adjust slot #${nextSlot.id} start to ${formatTime(newEnd)} (no gap)`,
                );
                console.log();

                const choice = await select({
                  message: "Choose option:",
                  choices: [
                    { name: "1 – Keep gap (create break)", value: "gap" },
                    {
                      name: `2 – Adjust slot #${nextSlot.id} start (no gap)`,
                      value: "adjust",
                    },
                  ],
                });
                if (choice === "adjust") {
                  adjustNeighbor = true;
                }
              } else if (
                currentEnd === null ||
                (newEnd.getTime() === nextStart.getTime() &&
                  currentEnd < nextStart)
              ) {
                // Closing a gap
                if (
                  currentEnd &&
                  currentEnd < nextStart &&
                  newEnd.getTime() === nextStart.getTime()
                ) {
                  console.log(
                    `${sym.warning} Changing end of slot #${id} to ${formatTime(newEnd)} would close the break before slot #${nextSlot.id}.`,
                  );
                  console.log(
                    `  Slot #${nextSlot.id} currently starts at ${formatTime(nextStart)}.`,
                  );
                  console.log();
                  const taskStr = current.task
                    ? `  #${current.task.id} ${current.task.name}`
                    : "  (no task)";
                  console.log("  Result:");
                  console.log(
                    `    Slot #${id}: ${formatTime(current.startedAt)} - ${formatTime(newEnd)}  (was ${formatTime(current.startedAt)} - ${formatTime(currentEnd)})${taskStr}`,
                  );
                  console.log(
                    `    Slot #${nextSlot.id}: ${formatTime(nextStart)} - ${nextSlot.endedAt ? formatTime(nextSlot.endedAt) : "open"}  (unchanged)`,
                  );
                  console.log(
                    `    Break removed: ${formatTime(currentEnd)} - ${formatTime(nextStart)}`,
                  );
                  console.log();

                  const ok = await confirm({
                    message: "Apply?",
                    default: false,
                  });
                  if (!ok) {
                    console.log("Aborted.");
                    return;
                  }
                }
              }
            }
          }

          const result = await editSlot(db, id, changes, adjustNeighbor);

          console.log(`${sym.edited} Slot #${id} updated`);

          if (changes.startedAt) {
            console.log(
              `  Start: ${formatTime(current.startedAt)} → ${formatTime(result.updated.startedAt)}`,
            );
          }
          if (changes.endedAt !== undefined) {
            if (changes.endedAt === null) {
              console.log(
                `  End: ${current.endedAt ? formatTime(current.endedAt) : "open"} → open (slot reopened)`,
              );
            } else {
              const oldEnd = current.endedAt
                ? formatTime(current.endedAt)
                : "open";
              const newEnd = result.updated.endedAt
                ? formatTime(result.updated.endedAt)
                : "open";
              console.log(`  End: ${oldEnd} → ${newEnd}`);
              if (!changes.startedAt) {
                const dur = slotDuration(result.updated);
                console.log(
                  `  Duration: ${formatDuration(slotDuration(current))} → ${formatDuration(dur)}`,
                );
              }
            }
          }
          if (result.neighborAdjusted) {
            const n = result.neighborAdjusted;
            console.log(
              `${sym.edited} Slot #${n.id} adjusted: ${n.field === "startedAt" ? "start" : "end"} ${formatTime(n.from)} → ${formatTime(n.to)}`,
            );
          }
          if (changes.taskId !== undefined) {
            const oldTask = current.task
              ? `#${current.task.id} "${current.task.name}"`
              : "(no task)";
            const newTask = result.updated.task
              ? `#${result.updated.task.id} "${result.updated.task.name}" (${colorProject(result.updated.task.project.name, result.updated.task.project.color)})`
              : "(no task)";
            console.log(`  Task: ${oldTask} → ${newTask}`);
          }
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // tt slot delete [id]
  slotCmd
    .command("delete [id]")
    .alias("rm")
    .description("Delete a slot")
    .action(async (idStr: string | undefined) => {
      try {
        let current: Awaited<ReturnType<typeof getSlot>>;
        if (idStr !== undefined) {
          const id = parseInt(idStr, 10);
          if (isNaN(id)) {
            printError(`Invalid slot ID: ${idStr}`);
            process.exit(1);
          }
          current = await getSlot(db, id);
          if (!current) {
            printError(`Slot #${id} not found`);
            process.exit(1);
          }
        } else {
          current = await pickSlot(db, "Which slot do you want to delete?");
        }

        const id = current.id;

        const from = formatTime(current.startedAt);
        const to = current.endedAt ? formatTime(current.endedAt) : "open";
        const taskInfo = current.task
          ? `#${current.task.id} ${current.task.name}`
          : "no task";

        console.log(
          `${sym.warning} This will delete slot #${id} (${from} - ${to}, ${taskInfo}).`,
        );

        // Find neighbors for the gap warning
        const startOfDay = new Date(current.startedAt);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(current.startedAt);
        endOfDay.setHours(23, 59, 59, 999);
        const daySlots = await listSlots(db, {
          from: startOfDay,
          to: endOfDay,
        });
        const idx = daySlots.findIndex((s) => s.id === id);
        const prev = idx > 0 ? daySlots[idx - 1] : undefined;
        const next = idx >= 0 ? daySlots[idx + 1] : undefined;

        if (prev && next && current.endedAt) {
          const gapFrom = prev.endedAt ?? current.startedAt;
          const gapTo = next.startedAt;
          if (gapFrom < gapTo) {
            const gapMins = Math.round(
              (gapTo.getTime() - gapFrom.getTime()) / 60000,
            );
            console.log(
              `  A break of ${formatTime(gapFrom)} - ${formatTime(gapTo)} (${formatDuration(gapMins)}) will result between slot #${prev.id} and #${next.id}.`,
            );
          }
        }
        console.log();

        const ok = await confirm({ message: "Are you sure?", default: false });
        if (!ok) {
          console.log("Aborted.");
          return;
        }

        await deleteSlot(db, id);
        console.log(`${sym.deleted} Slot #${id} deleted.`);
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // tt slot split [id] <time>
  slotCmd
    .command("split [id] <time>")
    .description("Split a slot at a given time")
    .action(async (idStr: string, timeStr: string) => {
      try {
        // Commander passes args positionally; if idStr looks like a time (HH:MM), it's the time
        // and no ID was given — but Commander can't handle this cleanly with [id] <time>.
        // Instead we treat idStr as ID if numeric, else as time with interactive picker.
        let current: Awaited<ReturnType<typeof getSlot>>;
        let resolvedTimeStr = timeStr;

        if (/^\d{1,2}:\d{2}$/.test(idStr)) {
          // No ID given — idStr is actually the time
          resolvedTimeStr = idStr;
          current = await pickSlot(db, "Which slot do you want to split?");
        } else {
          const id = parseInt(idStr, 10);
          if (isNaN(id)) {
            printError(`Invalid slot ID: ${idStr}`);
            process.exit(1);
          }
          current = await getSlot(db, id);
          if (!current) {
            printError(`Slot #${id} not found`);
            process.exit(1);
          }
        }

        const id = current.id;
        const at = parseTime(resolvedTimeStr, current.startedAt);
        const taskInfo = current.task
          ? `#${current.task.id} ${current.task.name}`
          : "(no task)";

        console.log(`  Splitting slot #${id} at ${formatTime(at)}...`);
        console.log();

        const result = await splitSlot(db, id, at);

        const origDur = slotDuration({
          startedAt: current.startedAt,
          endedAt: current.endedAt,
        });
        const firstDur = slotDuration(result.first);
        const secondDur = slotDuration(result.second);
        const secondEnd = result.second.endedAt
          ? formatTime(result.second.endedAt)
          : "open";

        console.log(
          `  Before: ${formatTime(current.startedAt)} - ${current.endedAt ? formatTime(current.endedAt) : "open"} | ${formatDuration(origDur)} | ${taskInfo}`,
        );
        console.log(
          `  After:  ${formatTime(result.first.startedAt)} - ${formatTime(result.first.endedAt)} | ${formatDuration(firstDur)} | ${taskInfo}  (Slot #${result.first.id})`,
        );
        console.log(
          `          ${formatTime(result.second.startedAt)} - ${secondEnd} | ${formatDuration(secondDur)} | ${taskInfo}  (Slot #${result.second.id})`,
        );
        console.log();
        console.log(
          `${sym.checked} Slot #${id} split into #${result.first.id} and #${result.second.id}.`,
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });
}
