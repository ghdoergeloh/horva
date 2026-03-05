import type { Command } from "commander";
import chalk from "chalk";

import {
  assignTaskToSlot,
  doneSlot,
  getLog,
  getOpenSlot,
  getSummary,
  listTasks,
  startSlot,
  stopSlot,
} from "@repo/core";

import { db } from "../lib/db";
import {
  colorProject,
  elapsed,
  formatDuration,
  formatTime,
  printError,
  sym,
} from "../lib/display";
import { createTaskInline, pickTask } from "../lib/pickers";

function parseTime(timeStr: string): Date {
  const now = new Date();
  const [h, m] = timeStr.split(":").map(Number);
  now.setHours(h ?? 0, m ?? 0, 0, 0);
  return now;
}

export function registerSlotCommands(program: Command): void {
  // tt start [ref]
  program
    .command("start [ref]")
    .alias("s")
    .description("Start tracking a task or work time")
    .option("-a, --at <time>", "Override start time (HH:MM)")
    .option("--assign", "Assign task to current open slot instead of new slot")
    .action(
      async (
        ref: string | undefined,
        opts: { at?: string; assign?: boolean },
      ) => {
        const at = opts.at ? parseTime(opts.at) : undefined;

        try {
          let taskId: number | undefined;

          if (ref) {
            const id = parseInt(ref.replace(/^#/, ""), 10);
            if (isNaN(id)) {
              taskId = await createTaskInline(db, ref);
            } else {
              taskId = id;
            }
          } else {
            // Interactive selection with project filter
            const picked = await pickTask(db, "What do you want to do?", {
              allowNone: true,
              noneLabel: "Start without task",
              noneFirst: true,
            });
            taskId = picked ?? undefined;
          }

          if (opts.assign) {
            const openSlot = await getOpenSlot(db);
            if (!openSlot) {
              printError("No open slot to assign task to");
              process.exit(1);
            }
            if (!taskId) {
              printError("Need a task ID to assign");
              process.exit(1);
            }
            await assignTaskToSlot(db, openSlot.id, taskId);
            console.log(
              `${sym.noTask} Assigned #${taskId} to current slot (started ${formatTime(openSlot.startedAt)})`,
            );
            return;
          }

          const result = await startSlot(db, taskId, at);

          if (result.closedSlot) {
            const cs = result.closedSlot;
            const end = formatTime(cs.endedAt);
            const start = formatTime(cs.startedAt);
            const mins = Math.round(
              (cs.endedAt.getTime() - cs.startedAt.getTime()) / 60000,
            );
            if (cs.taskId) {
              console.log(
                `${sym.stop} Stopped #${cs.taskId} at ${end} (${start} - ${end} | ${formatDuration(mins)})`,
              );
            } else {
              console.log(
                `${sym.stop} Stopped working (no task) at ${end} (${start} - ${end} | ${formatDuration(mins)})`,
              );
            }
          }

          const startTime = formatTime(result.newSlot.startedAt);
          if (taskId) {
            const tasks = await listTasks(db, { status: "open" });
            const t = tasks.find((x) => x.id === taskId);
            if (t) {
              console.log(
                `${sym.start} Working on #${t.id} "${t.name}" (${colorProject(t.project.name, t.project.color)}) since ${startTime}`,
              );
            } else {
              console.log(
                `${sym.start} Working on #${taskId} since ${startTime}`,
              );
            }
          } else {
            console.log(
              `${sym.noTask} Tracking work time without task since ${startTime}`,
            );
          }
        } catch (err) {
          printError(String(err));
          process.exit(1);
        }
      },
    );

  // tt stop
  program
    .command("stop")
    .alias("x")
    .description("Stop current task, keep tracking work time")
    .option("-a, --at <time>", "Override stop time (HH:MM)")
    .action(async (opts: { at?: string }) => {
      const at = opts.at ? parseTime(opts.at) : undefined;
      try {
        const result = await stopSlot(db, at);
        if (!result.closedSlot) {
          console.log("  Nothing to stop – no active slot.");
          return;
        }
        const s = result.closedSlot;
        const end = formatTime(s.endedAt);
        const start = formatTime(s.startedAt);
        const mins = Math.round(
          (s.endedAt.getTime() - s.startedAt.getTime()) / 60000,
        );
        if (s.task) {
          console.log(
            `${sym.stop} Stopped #${s.task.id} "${s.task.name}" at ${end} (${start} - ${end} | ${formatDuration(mins)})`,
          );
        } else {
          console.log(
            `${sym.stop} Stopped working (no task) at ${end} (${start} - ${end} | ${formatDuration(mins)})`,
          );
        }
        console.log(
          `${sym.noTask} Tracking work time without task since ${formatTime(result.newSlot.startedAt)}`,
        );
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // tt done
  program
    .command("done")
    .alias("d")
    .description("End work time completely")
    .option("-a, --at <time>", "Override end time (HH:MM)")
    .action(async (opts: { at?: string }) => {
      const at = opts.at ? parseTime(opts.at) : undefined;
      try {
        const result = await doneSlot(db, at);
        if (!result.closedSlot) {
          console.log("  Nothing to stop – no active slot.");
          return;
        }
        const s = result.closedSlot;
        const end = formatTime(s.endedAt);
        const start = formatTime(s.startedAt);
        const mins = Math.round(
          (s.endedAt.getTime() - s.startedAt.getTime()) / 60000,
        );
        if (s.task) {
          console.log(
            `${sym.stop} Stopped #${s.task.id} "${s.task.name}" at ${end} (${start} - ${end} | ${formatDuration(mins)})`,
          );
        } else {
          console.log(
            `${sym.stop} Stopped working (no task) at ${end} (${start} - ${end} | ${formatDuration(mins)})`,
          );
        }
        console.log(`${sym.done} Work ended at ${end}`);

        // Show today's summary
        const summary = await getSummary(db, "today");
        const totalMins = summary.reduce((a, b) => a + b.totalMinutes, 0);
        console.log(`\n  Today: ${formatDuration(totalMins)} worked`);
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // tt status
  program
    .command("status")
    .alias("?")
    .description("Show current tracking status")
    .action(async () => {
      try {
        const openSlot = await getOpenSlot(db);
        if (!openSlot) {
          console.log(`${sym.done} Not working.`);
          // Show last slot
          const todaySlots = await getLog(db, "today");
          const last = todaySlots[todaySlots.length - 1];
          if (last) {
            const start = formatTime(last.startedAt);
            const end = last.endedAt ? formatTime(last.endedAt) : "?";
            const mins = last.endedAt
              ? Math.round(
                  (last.endedAt.getTime() - last.startedAt.getTime()) / 60000,
                )
              : 0;
            console.log(
              `\n  Last session: today, ${start} - ${end} (${formatDuration(mins)})`,
            );
          }
          return;
        }

        const since = formatTime(openSlot.startedAt);
        const elapsedTime = elapsed(openSlot.startedAt);

        if (openSlot.task) {
          const t = openSlot.task;
          console.log(
            `${sym.start} Working on #${t.id} "${t.name}" (${colorProject(t.project.name, t.project.color)}) since ${since} (${elapsedTime})`,
          );
        } else {
          console.log(
            `${sym.noTask} Working without task since ${since} (${elapsedTime})`,
          );
        }

        // Today summary
        const summary = await getSummary(db, "today");
        const totalMins = summary.reduce((a, b) => a + b.totalMinutes, 0);

        if (totalMins > 0) {
          console.log(
            chalk.dim(`\n  Today so far: ${formatDuration(totalMins)} worked`),
          );
          for (const [i, entry] of summary.entries()) {
            const pct = Math.round((entry.totalMinutes / totalMins) * 100);
            const bar = "█".repeat(Math.round(pct / 5)).padEnd(20, "░");
            const prefix = i === summary.length - 1 ? "  └──" : "  ├──";
            console.log(
              `${prefix} ${colorProject(entry.projectName.padEnd(12), entry.projectColor)} ${formatDuration(entry.totalMinutes).padStart(6)}  ${bar}  ${pct}%`,
            );
          }
        }
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });
}
