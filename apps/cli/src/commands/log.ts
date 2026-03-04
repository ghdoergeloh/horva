import type { Command } from "commander";
import chalk from "chalk";

import type { Period } from "@repo/core";
import { getLog, getOpenSlot, getSummary } from "@repo/core";

import { db } from "../lib/db";
import {
  colorProject,
  formatDuration,
  formatTime,
  padVisible,
  printError,
  progressBar,
  sym,
} from "../lib/display";

function parsePeriod(str: string | undefined): Period {
  if (!str) return "today";
  const valid = ["today", "yesterday", "week", "month", "all"];
  if (valid.includes(str)) return str as Period;
  return "today";
}

export function registerLogCommands(program: Command): void {
  // tt log
  program
    .command("log [period]")
    .alias("lg")
    .description("Show time log")
    .action(async (periodStr: string | undefined) => {
      try {
        const period = parsePeriod(periodStr);
        const [slots, openSlot] = await Promise.all([
          getLog(db, period),
          period === "today" ? getOpenSlot(db) : Promise.resolve(null),
        ]);

        if (slots.length === 0 && !openSlot) {
          console.log("  No entries found.");
          return;
        }

        // Group by date
        const byDate = new Map<string, typeof slots>();
        for (const s of slots) {
          const dateKey = s.startedAt.toLocaleDateString("en", {
            weekday: "short",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          if (!byDate.has(dateKey)) byDate.set(dateKey, []);
          const dateGroup = byDate.get(dateKey);
          if (dateGroup) dateGroup.push(s);
        }

        // Ensure today's date group exists when only an open slot is present
        if (openSlot && byDate.size === 0) {
          const todayKey = openSlot.startedAt.toLocaleDateString("en", {
            weekday: "short",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          byDate.set(todayKey, []);
        }

        for (const [date, dateSlots] of byDate) {
          console.log(chalk.bold(`\n  ${date}\n`));
          console.log(
            chalk.dim(
              `  ${"From".padEnd(7)} ${"To".padEnd(7)} ${"Time".padEnd(8)} ${"Task".padEnd(32)} Project`,
            ),
          );

          let prevEnd: Date | null = null;
          let totalMins = 0;

          for (const s of dateSlots) {
            const from = formatTime(s.startedAt);
            const to = s.endedAt ? formatTime(s.endedAt) : "...";
            const mins = s.endedAt
              ? Math.round(
                  (s.endedAt.getTime() - s.startedAt.getTime()) / 60000,
                )
              : 0;

            // Show gap as break
            if (prevEnd) {
              const gapMins = Math.round(
                (s.startedAt.getTime() - prevEnd.getTime()) / 60000,
              );
              if (gapMins > 0) {
                console.log(
                  chalk.dim(
                    `        - ${to.padEnd(6)} ${" ".repeat(8)} (break – ${formatDuration(gapMins)})`,
                  ),
                );
              }
            }
            prevEnd = s.endedAt ?? null;
            totalMins += mins;

            const taskStr = s.task
              ? `#${s.task.id} ${s.task.name}`.substring(0, 31)
              : "-";
            const projectStr = s.task
              ? colorProject(s.task.project.name, s.task.project.color)
              : "";

            console.log(
              `  ${from.padEnd(7)} ${to.padEnd(7)} ${formatDuration(mins).padEnd(8)} ${taskStr.padEnd(32)} ${projectStr}`,
            );
          }

          // Show open slot if it belongs to this date group
          if (openSlot) {
            const openDateKey = openSlot.startedAt.toLocaleDateString("en", {
              weekday: "short",
              year: "numeric",
              month: "long",
              day: "numeric",
            });
            if (openDateKey === date) {
              const from = formatTime(openSlot.startedAt);
              const runningMins = Math.round(
                (Date.now() - openSlot.startedAt.getTime()) / 60000,
              );
              if (prevEnd) {
                const gapMins = Math.round(
                  (openSlot.startedAt.getTime() - prevEnd.getTime()) / 60000,
                );
                if (gapMins > 0) {
                  console.log(
                    chalk.dim(
                      `        - ${from.padEnd(6)} ${" ".repeat(8)} (break – ${formatDuration(gapMins)})`,
                    ),
                  );
                }
              }
              const taskStr = openSlot.task
                ? `#${openSlot.task.id} ${openSlot.task.name}`.substring(0, 31)
                : "-";
              const projectStr = openSlot.task
                ? colorProject(
                    openSlot.task.project.name,
                    openSlot.task.project.color,
                  )
                : "";
              const toField = padVisible(sym.start, 7);
              console.log(
                chalk.green(
                  `  ${from.padEnd(7)} ${toField} ${formatDuration(runningMins).padEnd(8)} ${taskStr.padEnd(32)} ${projectStr}`,
                ),
              );
              totalMins += runningMins;
            }
          }

          console.log(
            chalk.dim(`  ${"".padEnd(55)} Total: ${formatDuration(totalMins)}`),
          );
        }
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });

  // tt summary
  program
    .command("summary [period]")
    .alias("sum")
    .description("Show time summary")
    .action(async (periodStr: string | undefined) => {
      try {
        const period = parsePeriod(periodStr);
        const summary = await getSummary(db, period);

        if (summary.length === 0) {
          console.log("  No data found.");
          return;
        }

        const totalMins = summary.reduce((a, b) => a + b.totalMinutes, 0);
        console.log(`\n  Total work time: ${formatDuration(totalMins)}\n`);
        console.log(chalk.bold("  Project breakdown:"));

        for (const entry of summary) {
          const pct = Math.round((entry.totalMinutes / totalMins) * 100);
          const bar = progressBar(entry.totalMinutes, totalMins, 30);
          const line = `  ${bar}  ${entry.projectName.padEnd(20)} ${formatDuration(entry.totalMinutes).padStart(7)}  ${String(pct).padStart(3)}%`;
          console.log(colorProject(line, entry.projectColor));
        }

        // Top tasks
        const allTasks = summary.flatMap((e) =>
          e.tasks.map((t) => ({
            ...t,
            projectName: e.projectName,
            projectColor: e.projectColor,
          })),
        );
        if (allTasks.length > 0) {
          allTasks.sort((a, b) => b.minutes - a.minutes);
          console.log(chalk.bold("\n  Top tasks:"));
          for (const t of allTasks.slice(0, 10)) {
            const projName = t.projectName.substring(0, 14).padEnd(15);
            console.log(
              `  #${String(t.taskId).padEnd(5)} ${t.taskName.substring(0, 28).padEnd(30)} ${colorProject(projName, t.projectColor)} ${formatDuration(t.minutes)}`,
            );
          }
        }
      } catch (err) {
        printError(String(err));
        process.exit(1);
      }
    });
}
