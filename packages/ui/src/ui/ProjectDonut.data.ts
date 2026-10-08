import type { ProjectColor } from "./Chip";

/** An id of a project in a chart. */
export type ChartKey = string | number;

/** The time of one project in the chosen period. */
export interface ProjectShare {
  id: ChartKey;
  name: string;
  color: ProjectColor | null;
  minutes: number;
  /** Time that belongs to no task. It always comes last, in `project-none`. */
  isWithoutTask?: boolean;
}

/** One segment of the donut and one row of its legend. */
export interface DonutSlice {
  id: ChartKey;
  name: string;
  color: ProjectColor | null;
  minutes: number;
  /** Whole percent of the total; all slices add up to 100. */
  percent: number;
  isWithoutTask: boolean;
  /** The projects grouped into "Others", smallest last. Empty otherwise. */
  grouped: ProjectShare[];
}

/** The id of the "Others" slice. */
export const OTHERS_KEY = "__others__";

/** The color of the "Others" slice: a neutral slate, not a default color. */
export const OTHERS_COLOR = "project-17";

/** The color of time without a task. */
export const WITHOUT_TASK_COLOR = "project-none";

/**
 * Whole percentages that add up to exactly 100 (largest remainder method).
 * All zeros when the total is 0.
 */
export function roundedPercents(values: number[]): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return values.map(() => 0);
  const exact = values.map((value) => (value / total) * 100);
  const floors = exact.map((value) => Math.floor(value));
  let missing = 100 - floors.reduce((sum, value) => sum + value, 0);
  const byRemainder = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of byRemainder) {
    if (missing <= 0) break;
    floors[index] = (floors[index] ?? 0) + 1;
    missing--;
  }
  return floors;
}

/**
 * The slices of the donut: projects by time, largest first, without empty
 * ones. With more than `maxProjects` projects the smallest are grouped into
 * one "Others" slice, so at most `maxProjects` project slices remain. Time
 * without a task always comes last.
 */
export function donutSlices(
  shares: ProjectShare[],
  { maxProjects = 8, othersLabel = "Weitere" } = {},
): DonutSlice[] {
  const projects = shares
    .filter((share) => !share.isWithoutTask && share.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const withoutTask = shares.filter(
    (share) => share.isWithoutTask && share.minutes > 0,
  );

  const rows: Omit<DonutSlice, "percent">[] = [];
  const kept =
    projects.length > maxProjects
      ? projects.slice(0, maxProjects - 1)
      : projects;
  for (const project of kept) {
    rows.push({ ...project, isWithoutTask: false, grouped: [] });
  }
  const grouped = projects.slice(kept.length);
  if (grouped.length > 0) {
    rows.push({
      id: OTHERS_KEY,
      name: othersLabel,
      color: OTHERS_COLOR,
      minutes: grouped.reduce((sum, share) => sum + share.minutes, 0),
      isWithoutTask: false,
      grouped,
    });
  }
  if (withoutTask.length > 0) {
    const first = withoutTask[0];
    rows.push({
      id: first?.id ?? "__without-task__",
      name: first?.name ?? "",
      color: WITHOUT_TASK_COLOR,
      minutes: withoutTask.reduce((sum, share) => sum + share.minutes, 0),
      isWithoutTask: true,
      grouped: [],
    });
  }

  const percents = roundedPercents(rows.map((row) => row.minutes));
  return rows.map((row, index) => ({ ...row, percent: percents[index] ?? 0 }));
}

/** Start and end of a slice in radians, clockwise from twelve o'clock. */
export interface Arc {
  start: number;
  end: number;
}

/** The angles of the slices, one after the other around the full circle. */
export function donutArcs(minutes: number[]): Arc[] {
  const total = minutes.reduce((sum, value) => sum + value, 0);
  let angle = 0;
  return minutes.map((value) => {
    const start = angle;
    angle += total > 0 ? (value / total) * Math.PI * 2 : 0;
    return { start, end: angle };
  });
}

/** A point on a circle; angle 0 is twelve o'clock, clockwise. */
export function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.sin(angle),
    y: cy - r * Math.cos(angle),
  };
}

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * The SVG path of an arc on a circle. A full circle is drawn as two halves,
 * because one arc command cannot start and end at the same point.
 */
export function arcPath(
  cx: number,
  cy: number,
  r: number,
  { start, end }: Arc,
): string {
  const sweep = end - start;
  if (sweep >= Math.PI * 2 - 1e-6) {
    const top = polar(cx, cy, r, 0);
    const bottom = polar(cx, cy, r, Math.PI);
    return `M${String(round(top.x))} ${String(round(top.y))}A${String(r)} ${String(r)} 0 1 1 ${String(round(bottom.x))} ${String(round(bottom.y))}A${String(r)} ${String(r)} 0 1 1 ${String(round(top.x))} ${String(round(top.y))}`;
  }
  const from = polar(cx, cy, r, start);
  const to = polar(cx, cy, r, end);
  const large = sweep > Math.PI ? 1 : 0;
  return `M${String(round(from.x))} ${String(round(from.y))}A${String(r)} ${String(r)} 0 ${String(large)} 1 ${String(round(to.x))} ${String(round(to.y))}`;
}
