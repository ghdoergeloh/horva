// Rules of the timer and the dialog "Start work / Switch task", kept apart
// from the components so they can be tested on their own.

/** The project colors a new project starts with, in order. */
const STARTER_COLORS = Array.from({ length: 8 }, (_, i) => `project-${i + 1}`);

/**
 * The project of the task that was started last, or `null` when no task
 * has a slot. The task picker puts a new task there by default.
 */
export function lastUsedProjectId(
  tasks: readonly {
    projectId: number;
    slots: readonly { startedAt: Date | string }[];
  }[],
): number | null {
  let latest: { at: number; projectId: number } | null = null;
  for (const task of tasks)
    for (const slot of task.slots) {
      const at = new Date(slot.startedAt).getTime();
      if (!latest || at > latest.at) latest = { at, projectId: task.projectId };
    }
  return latest?.projectId ?? null;
}

/**
 * The color of a new project: the least used of `project-1` … `project-8`
 * among the existing projects, the smallest number on a tie.
 */
export function nextProjectColor(
  projects: readonly { color: string }[],
): string {
  const counts = new Map(STARTER_COLORS.map((color) => [color, 0]));
  for (const { color } of projects) {
    const count = counts.get(color);
    if (count !== undefined) counts.set(color, count + 1);
  }
  let best = STARTER_COLORS[0] ?? "project-1";
  for (const color of STARTER_COLORS)
    if ((counts.get(color) ?? 0) < (counts.get(best) ?? 0)) best = color;
  return best;
}

/** Whole seconds since `startedAt`; zero without a running slot. */
export function elapsedSeconds(
  startedAt: Date | string | null | undefined,
  now: number,
): number {
  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
}

/** The minutes of the closed slots plus the whole minutes of the running one. */
export function workedMinutes(
  loggedMinutes: number,
  runningSeconds: number,
): number {
  return loggedMinutes + Math.floor(runningSeconds / 60);
}
