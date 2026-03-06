import { input, select, Separator } from "@inquirer/prompts";

import {
  createLabel,
  createProject,
  createTask,
  listLabels,
  listProjects,
  listSlots,
  listTasks,
} from "@repo/core";

import type { Db } from "./db.js";
import { colorProject, formatDuration, formatTime, sym } from "./display.js";

type SlotChoice = Awaited<ReturnType<typeof listSlots>>[number];

function slotDuration(s: { startedAt: Date; endedAt: Date | null }): number {
  if (!s.endedAt) return 0;
  return Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000);
}

export async function createTaskInline(
  db: Db,
  prefill?: { name?: string; projectId?: number },
): Promise<number> {
  const name = prefill?.name ?? (await input({ message: "Task name:" }));
  let projectId = prefill?.projectId;
  if (projectId === undefined) {
    const projects = await listProjects(db);
    if (projects.length > 1) {
      projectId = await pickProject(db, "Project:");
    } else if (projects[0]) {
      projectId = projects[0].id;
    }
  }
  const task = await createTask(db, { name, projectId });
  return task.id;
}

export async function pickTask(
  db: Db,
  message: string,
  opts?: {
    allowNone?: boolean;
    noneLabel?: string;
    noneFirst?: boolean;
  },
): Promise<number | null> {
  if (opts?.allowNone && opts.noneFirst) {
    const noneLabel = opts.noneLabel ?? "(no task)";
    const first = await select({
      message,
      choices: [
        { name: noneLabel, value: "none" as const },
        { name: "Select a task...", value: "pick" as const },
        { name: "Create new task...", value: "create" as const },
      ],
    });
    if (first === "none") return null;
    if (first === "create") return createTaskInline(db);
  }

  const projects = await listProjects(db);
  let projectId: number | undefined;

  if (projects.length > 1) {
    const projectChoices: { name: string; value: number | null }[] =
      projects.map((p) => ({
        name: `#${p.id} ${colorProject(p.name, p.color)}`,
        value: p.id,
      }));
    projectChoices.push({ name: "All projects", value: null });
    const picked = await select({
      message: "Filter by project:",
      choices: projectChoices,
    });
    projectId = picked ?? undefined;
  }

  const tasks = await listTasks(db, { status: "open", projectId });

  const activities = tasks.filter((t) => t.taskType === "activity");
  const regularTasks = tasks.filter((t) => t.taskType === "task");

  type Choice =
    | { name: string; value: number | null }
    | InstanceType<typeof Separator>;
  const choices: Choice[] = [];

  if (activities.length > 0) {
    choices.push(new Separator("── Activities ──"));
    for (const t of activities) {
      choices.push({
        name: `#${t.id} ${t.name}  (${colorProject(t.project.name, t.project.color)})`,
        value: t.id,
      });
    }
  }

  if (regularTasks.length > 0) {
    choices.push(new Separator("── Recent tasks ──"));
    for (const t of regularTasks) {
      choices.push({
        name: `#${t.id} ${t.name}  (${colorProject(t.project.name, t.project.color)})`,
        value: t.id,
      });
    }
  }

  if (opts?.allowNone && !opts.noneFirst) {
    choices.push({ name: opts.noneLabel ?? "(no task)", value: null });
  }

  choices.push({ name: "Create new task...", value: -1 });

  const result = await select({
    message: opts?.noneFirst ? "Select task:" : message,
    choices,
  });
  if (result === -1) return createTaskInline(db, { projectId });
  return result;
}

export async function createProjectInline(
  db: Db,
  prefill?: { name?: string; color?: string },
): Promise<number> {
  const name = prefill?.name ?? (await input({ message: "Project name:" }));
  const project = await createProject(db, {
    name,
    color: prefill?.color ?? "#6366f1",
  });
  return project.id;
}

export async function pickProject(db: Db, message: string): Promise<number> {
  const projects = await listProjects(db);

  const choices: { name: string; value: number }[] = projects.map((p) => ({
    name: `#${p.id} ${colorProject(p.name, p.color)}`,
    value: p.id,
  }));
  choices.push({ name: "Create new project...", value: -1 });

  if (choices.length === 1) return createProjectInline(db);

  const result = await select({ message, choices });
  if (result === -1) return createProjectInline(db);
  return result;
}

export async function createLabelInline(
  db: Db,
  prefill?: { name?: string },
): Promise<number> {
  const name = prefill?.name ?? (await input({ message: "Label name:" }));
  const label = await createLabel(db, name);
  return label.id;
}

export async function pickLabel(db: Db, message: string): Promise<number> {
  const labels = await listLabels(db);
  const choices: { name: string; value: number }[] = labels.map((l) => ({
    name: l.name,
    value: l.id,
  }));
  choices.push({ name: "Create new label...", value: -1 });

  if (choices.length === 1) return createLabelInline(db);

  const result = await select({ message, choices });
  if (result === -1) return createLabelInline(db);
  return result;
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
