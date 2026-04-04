import type { Db } from "@timetracker/db/client";
import { and, gte, isNotNull, lte } from "@timetracker/db";
import { slot } from "@timetracker/db/schema";

export type Period = "today" | "yesterday" | "week" | "month" | "all";

export function getPeriodRange(period: Period): { from: Date; to: Date } {
  const now = new Date();
  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };
  const endOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  switch (period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    }
    case "week": {
      const day = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - ((day + 6) % 7));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      return { from: startOfDay(monday), to: endOfDay(sunday) };
    }
    case "month": {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return { from: startOfDay(from), to: endOfDay(to) };
    }
    case "all":
      return { from: new Date(0), to: new Date(8640000000000000) };
  }
}

export async function getLog(
  db: Db,
  period: Period | { from: Date; to: Date },
) {
  const { from, to } =
    typeof period === "string" ? getPeriodRange(period) : period;

  const rows = await db.query.slot.findMany({
    where: and(
      gte(slot.startedAt, from),
      lte(slot.startedAt, to),
      isNotNull(slot.endedAt),
    ),
    with: {
      task: {
        with: {
          project: true,
          taskLabels: { with: { label: true } },
        },
      },
    },
    orderBy: (s, { asc }) => [asc(s.startedAt)],
  });

  return rows;
}

export interface SummaryEntry {
  projectId: number | null;
  projectName: string;
  projectColor: string;
  totalMinutes: number;
  tasks: {
    taskId: number;
    taskName: string;
    minutes: number;
  }[];
}

export async function getSummary(
  db: Db,
  period: Period | { from: Date; to: Date },
) {
  const slots = await getLog(db, period);

  const projectMap = new Map<
    number | "no_task",
    {
      projectId: number | null;
      projectName: string;
      projectColor: string;
      totalMinutes: number;
      taskMap: Map<number, { taskName: string; minutes: number }>;
    }
  >();

  for (const s of slots) {
    if (!s.endedAt) continue;
    const durationMs = s.endedAt.getTime() - s.startedAt.getTime();
    const minutes = Math.round(durationMs / 60000);

    const key: number | "no_task" = s.task?.project.id ?? "no_task";

    if (!projectMap.has(key)) {
      projectMap.set(key, {
        projectId: s.task?.project.id ?? null,
        projectName: s.task?.project.name ?? "(no task)",
        projectColor: s.task?.project.color ?? "#888888",
        totalMinutes: 0,
        taskMap: new Map(),
      });
    }

    const entry = projectMap.get(key);
    if (!entry) throw new Error("Unexpected missing project map entry");
    entry.totalMinutes += minutes;

    if (s.task) {
      const existingTask = entry.taskMap.get(s.task.id) ?? {
        taskName: s.task.name,
        minutes: 0,
      };
      existingTask.minutes += minutes;
      entry.taskMap.set(s.task.id, existingTask);
    }
  }

  return Array.from(projectMap.values()).map((entry) => ({
    projectId: entry.projectId,
    projectName: entry.projectName,
    projectColor: entry.projectColor,
    totalMinutes: entry.totalMinutes,
    tasks: Array.from(entry.taskMap.entries())
      .map(([taskId, t]) => ({
        taskId,
        taskName: t.taskName,
        minutes: t.minutes,
      }))
      .sort((a, b) => b.minutes - a.minutes),
  }));
}
