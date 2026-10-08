import type { CalendarDate } from "@internationalized/date";
import { fromDate, toCalendarDate } from "@internationalized/date";

import type { ChartProject, HoursPerDayProps } from "@horva/ui/HoursPerDay";
import type { BreakdownProject } from "@horva/ui/ProjectBreakdown";
import type { ProjectDonutProps } from "@horva/ui/ProjectDonut";

type ProjectShare = ProjectDonutProps["projects"][number];
type DayEntry = HoursPerDayProps["days"][number];

/** One project of `log.summary`. */
export interface SummaryEntry {
  projectId: number | null;
  projectName: string;
  projectColor: string;
  totalMinutes: number;
  tasks: { taskId: number; taskName: string; minutes: number }[];
}

/** The fields of a `log.entries` slot the report reads. */
export interface ReportSlot {
  startedAt: Date | string;
  endedAt: Date | string | null;
  task?: {
    id: number;
    project: { id: number };
    taskLabels: { label: { id: number } }[];
  } | null;
}

/** The chart key of time without a task. */
export const WITHOUT_TASK = "none";

/** The chart key of a summary entry. */
export function entryKey(entry: Pick<SummaryEntry, "projectId">) {
  return entry.projectId ?? WITHOUT_TASK;
}

/**
 * Summary entries ordered for the report: largest first, time without a
 * task always last. The input stays unchanged.
 */
export function sortEntries(summary: readonly SummaryEntry[]): SummaryEntry[] {
  return [...summary].sort((a, b) => {
    if ((a.projectId === null) !== (b.projectId === null))
      return a.projectId === null ? 1 : -1;
    return b.totalMinutes - a.totalMinutes;
  });
}

/** The name of an entry; time without a task gets `withoutTask`. */
function entryName(entry: SummaryEntry, withoutTask: string) {
  return entry.projectId === null ? withoutTask : entry.projectName;
}

/** The color of an entry; time without a task gets `project-none`. */
function entryColor(entry: SummaryEntry) {
  return entry.projectId === null ? null : entry.projectColor;
}

/** The slices of the project donut. */
export function donutProjects(
  summary: readonly SummaryEntry[],
  withoutTask: string,
): ProjectShare[] {
  return sortEntries(summary).map((entry) => ({
    id: entryKey(entry),
    name: entryName(entry, withoutTask),
    color: entryColor(entry),
    minutes: entry.totalMinutes,
    isWithoutTask: entry.projectId === null,
  }));
}

/** The legend of the hours-per-day chart, in the stack order. */
export function chartProjects(
  summary: readonly SummaryEntry[],
  withoutTask: string,
): ChartProject[] {
  return sortEntries(summary).map((entry) => ({
    id: entryKey(entry),
    name: entryName(entry, withoutTask),
    color: entryColor(entry),
  }));
}

/**
 * The rows of the project breakdown. With `taskIds`, only these tasks are
 * kept, and projects without one of them are left out.
 */
export function breakdownProjects(
  summary: readonly SummaryEntry[],
  withoutTask: string,
  taskIds?: ReadonlySet<number>,
): BreakdownProject[] {
  return sortEntries(summary).flatMap((entry) => {
    const tasks = entry.tasks
      .filter((task) => !taskIds || taskIds.has(task.taskId))
      .map((task) => ({
        id: task.taskId,
        name: task.taskName,
        minutes: task.minutes,
      }));
    if (taskIds && tasks.length === 0) return [];
    return [
      {
        id: entryKey(entry),
        name: entryName(entry, withoutTask),
        color: entryColor(entry),
        minutes: taskIds
          ? tasks.reduce((sum, task) => sum + task.minutes, 0)
          : entry.totalMinutes,
        tasks,
      },
    ];
  });
}

/** The ids of the logged tasks that carry the label. */
export function taskIdsWithLabel(
  slots: readonly ReportSlot[],
  labelId: number,
): Set<number> {
  const ids = new Set<number>();
  for (const slot of slots)
    if (slot.task?.taskLabels.some((link) => link.label.id === labelId))
      ids.add(slot.task.id);
  return ids;
}

/** Whole minutes of a closed slot, rounded like `log.summary` does. */
function slotMinutes(slot: ReportSlot) {
  if (!slot.endedAt) return 0;
  const ms =
    new Date(slot.endedAt).getTime() - new Date(slot.startedAt).getTime();
  return Math.round(ms / 60000);
}

/**
 * One entry per day of the range, empty days included, with the time per
 * project. A slot counts on the day it starts, in `timeZone`.
 */
export function dayEntries(
  slots: readonly ReportSlot[],
  range: { start: CalendarDate; end: CalendarDate },
  timeZone: string,
  label: (
    date: CalendarDate,
    dayCount: number,
  ) => {
    label: string;
    fullLabel: string;
  },
): DayEntry[] {
  const byDay = new Map<string, Map<string | number, number>>();
  for (const slot of slots) {
    const minutes = slotMinutes(slot);
    if (minutes <= 0) continue;
    const day = toCalendarDate(
      fromDate(new Date(slot.startedAt), timeZone),
    ).toString();
    const projects = byDay.get(day) ?? new Map<string | number, number>();
    const key = slot.task?.project.id ?? WITHOUT_TASK;
    projects.set(key, (projects.get(key) ?? 0) + minutes);
    byDay.set(day, projects);
  }

  const dayCount = range.end.compare(range.start) + 1;
  const days: DayEntry[] = [];
  for (let date = range.start; date.compare(range.end) <= 0;) {
    const key = date.toString();
    days.push({
      date: key,
      ...label(date, dayCount),
      minutes: [...(byDay.get(key) ?? new Map<string | number, number>())].map(
        ([projectId, minutes]) => ({ projectId, minutes }),
      ),
    });
    date = date.add({ days: 1 });
  }
  return days;
}

/** The number of days that have any time. */
export function daysWithTime(days: readonly DayEntry[]): number {
  return days.filter((day) => day.minutes.some((part) => part.minutes > 0))
    .length;
}
