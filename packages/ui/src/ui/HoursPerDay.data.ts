import type { ChartKey } from "./ProjectDonut.data";

/** The time of one project on one day. */
export interface DayProjectMinutes {
  projectId: ChartKey;
  minutes: number;
}

/** One day of the chart. */
export interface DayEntry {
  /** ISO date, `2026-10-05`. Used for the week separators. */
  date: string;
  /** Short axis label, such as `Mo` or `5.10.`. */
  label: string;
  /** Long label for the tooltip and the table; defaults to `label`. */
  fullLabel?: string;
  minutes: DayProjectMinutes[];
}

/** The y axis: the top value and the lines, both in minutes. */
export interface HourAxis {
  max: number;
  ticks: number[];
}

/** Steps between axis lines, in hours. */
const steps = [1, 2, 4, 6, 12, 24];

/**
 * A y axis in whole hours that holds the longest day and the target, with
 * at most `maxTicks` steps above zero. Without any time it still shows
 * the range up to the target, or two hours.
 */
export function hourAxis(
  maxMinutes: number,
  targetMinutes = 0,
  maxTicks = 5,
): HourAxis {
  const top = Math.max(maxMinutes, targetMinutes, 0) / 60;
  const needed = top > 0 ? top : 2;
  const step =
    steps.find((candidate) => Math.ceil(needed / candidate) <= maxTicks) ??
    Math.ceil(needed / maxTicks);
  // Leave room above a target that sits exactly on the top line.
  let count = Math.max(1, Math.ceil(needed / step));
  if (targetMinutes > 0 && count * step * 60 === targetMinutes) count++;
  const ticks = Array.from({ length: count + 1 }, (_, i) => i * step * 60);
  return { max: count * step * 60, ticks };
}

/** One part of a stacked column, in minutes from the bottom. */
export interface StackPart {
  projectId: ChartKey;
  minutes: number;
  from: number;
  to: number;
}

/**
 * The parts of one day, stacked in the order of `projectOrder` (the
 * legend), so each project keeps its place in every column. Projects that
 * are not in the order come last.
 */
export function stackDay(
  minutes: DayProjectMinutes[],
  projectOrder: ChartKey[],
): StackPart[] {
  const rank = (id: ChartKey) => {
    const index = projectOrder.indexOf(id);
    return index === -1 ? projectOrder.length : index;
  };
  const sorted = minutes
    .filter((part) => part.minutes > 0)
    .sort((a, b) => rank(a.projectId) - rank(b.projectId));
  let bottom = 0;
  return sorted.map((part) => {
    const from = bottom;
    bottom += part.minutes;
    return {
      projectId: part.projectId,
      minutes: part.minutes,
      from,
      to: bottom,
    };
  });
}

/** The sum of one day. */
export function dayTotal(day: DayEntry): number {
  return day.minutes.reduce((sum, part) => sum + Math.max(0, part.minutes), 0);
}

/** The time of one project on one day. */
export function projectMinutes(day: DayEntry, projectId: ChartKey): number {
  return day.minutes
    .filter((part) => part.projectId === projectId)
    .reduce((sum, part) => sum + Math.max(0, part.minutes), 0);
}

/** Weekday of an ISO date, Monday = 0. */
function weekday(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const utc = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  return (utc.getUTCDay() + 6) % 7;
}

/** Indexes of the days that start a new week (a Monday after day one). */
export function weekStarts(dates: string[]): number[] {
  return dates.flatMap((date, index) =>
    index > 0 && weekday(date) === 0 ? [index] : [],
  );
}

/** From this many days on, columns lose their sums and get week lines. */
export const DENSE_DAYS = 15;
