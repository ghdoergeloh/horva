import { input, select } from "@inquirer/prompts";

import { listProjects, listSlots, listTasks } from "@repo/core";

import type { Db } from "./db.js";
import { colorProject, formatDuration, formatTime, sym } from "./display.js";

type SlotChoice = Awaited<ReturnType<typeof listSlots>>[number];

function slotDuration(s: { startedAt: Date; endedAt: Date | null }): number {
  if (!s.endedAt) return 0;
  return Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000);
}

export async function pickTask(
  db: Db,
  message: string,
  opts?: { allowNone?: boolean; noneLabel?: string },
): Promise<number | null> {
  const tasks = await listTasks(db, { status: "open" });
  if (tasks.length === 0) throw new Error("No open tasks found.");

  const choices: { name: string; value: number | null }[] = tasks.map((t) => ({
    name: `#${t.id} ${t.name}  (${colorProject(t.project.name, t.project.color)})`,
    value: t.id,
  }));

  if (opts?.allowNone) {
    choices.push({ name: opts.noneLabel ?? "(no task)", value: null });
  }

  return select({ message, choices });
}

export async function pickProject(db: Db, message: string): Promise<number> {
  const projects = await listProjects(db);
  if (projects.length === 0) throw new Error("No projects found.");

  const choices = projects.map((p) => ({
    name: `#${p.id} ${colorProject(p.name, p.color)}`,
    value: p.id,
  }));

  return select({ message, choices });
}

export async function pickSlot(db: Db, message: string): Promise<SlotChoice> {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const slots = await listSlots(db, { from, to: now });
  if (slots.length === 0) {
    throw new Error("No slots found in the last 24 hours.");
  }

  const choices = [...slots].reverse().map((s) => {
    const fromStr = formatTime(s.startedAt);
    const toStr = s.endedAt ? formatTime(s.endedAt) : `${sym.start} open`;
    const dur = s.endedAt ? formatDuration(slotDuration(s)) : "...";
    const taskInfo = s.task ? `#${s.task.id} ${s.task.name}` : "(no task)";
    const proj = s.task
      ? colorProject(s.task.project.name, s.task.project.color)
      : "";
    return {
      name: `#${s.id}  ${fromStr} - ${toStr}  ${dur.padStart(5)}  ${taskInfo}  ${proj}`,
      value: s,
    };
  });

  return select({ message, choices });
}

export async function askChange(
  label: string,
  currentDisplay: string | null,
  opts?: { canRemove?: boolean; removeLabel?: string },
): Promise<"keep" | "change" | "remove"> {
  const keepLabel = currentDisplay ? `Keep (${currentDisplay})` : "Keep";
  const choices: { name: string; value: "keep" | "change" | "remove" }[] = [
    { name: keepLabel, value: "keep" },
    { name: "Change", value: "change" },
  ];
  if (opts?.canRemove) {
    choices.push({ name: opts.removeLabel ?? "Remove", value: "remove" });
  }

  return select({ message: label, choices });
}

export async function promptOptionalString(
  message: string,
  defaultValue: string,
): Promise<string> {
  return input({ message, default: defaultValue });
}
