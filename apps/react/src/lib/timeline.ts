import type { BreakdownProject } from "@horva/ui/ProjectBreakdown";
import type { SlotDraft, SlotTableSlot } from "@horva/ui/SlotTable";
import type { WorkPeriod } from "@horva/ui/WorkPeriodList";

import type { client } from "#/lib/orpc.js";
import { localDateStr } from "#/lib/dateUtils.js";

/** A slot as `slot.list` returns it. */
export type TimelineSlot = Awaited<
  ReturnType<typeof client.slot.list>
>["slots"][number];

/** A work period as `log.workPeriods` returns it. */
export type TimelinePeriod = Awaited<
  ReturnType<typeof client.log.workPeriods>
>["periods"][number];

/** A project as the timeline needs it. */
export interface TimelineProject {
  id: number;
  name: string;
  color: string | null;
}

/** Texts for slots without a task or with a deleted task. */
export interface SlotTexts {
  noTask: string;
  deletedTask: string;
  noProject: string;
}

const MINUTE = 60_000;

/** Monday 00:00 of the week of `date`, in local time. */
export function startOfWeek(date: Date): Date {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
}

/** The date `days` days after `date`, at the same clock time. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** The seven days of the week that starts on `weekStart`. */
export function weekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

/** The key of a day, such as `2026-10-08`. */
export function dayKey(date: Date | string): string {
  return localDateStr(date);
}

/** The slots that start on `day`, sorted by start. */
export function slotsStartingOn(
  slots: readonly TimelineSlot[],
  day: Date,
): TimelineSlot[] {
  const key = dayKey(day);
  return slots
    .filter((s) => dayKey(s.startedAt) === key)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

/**
 * The slots that lie on `day` at least in part: a slot across midnight
 * shows on both days. A running slot lasts until `now`.
 */
export function slotsOverlapping(
  slots: readonly TimelineSlot[],
  day: Date,
  now: Date,
): TimelineSlot[] {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const to = addDays(from, 1);
  return slots.filter((s) => s.startedAt < to && (s.endedAt ?? now) > from);
}

/** The project color of a slot: deleted task, no task, or the project. */
export function slotColor(slot: TimelineSlot): string | null {
  if (slot.state === "task_deleted") return "project-deleted";
  return slot.task?.project.color ?? null;
}

/** The task name of a slot, or the text for no task or a deleted task. */
export function slotTitle(slot: TimelineSlot, texts: SlotTexts): string {
  if (slot.task) return slot.task.name;
  return slot.state === "task_deleted" ? texts.deletedTask : texts.noTask;
}

/** A slot as a row of the slot table. */
export function toTableSlot(
  slot: TimelineSlot,
  texts: SlotTexts,
): SlotTableSlot {
  return {
    id: slot.id,
    start: slot.startedAt,
    end: slot.endedAt,
    taskId: slot.taskId,
    task:
      slot.task || slot.state === "task_deleted"
        ? slotTitle(slot, texts)
        : null,
    project: slot.task
      ? { name: slot.task.project.name, color: slot.task.project.color }
      : null,
  };
}

/** A work period of the API as a row of the work period list. */
export function toWorkPeriod(
  period: TimelinePeriod,
  projects: ReadonlyMap<number, TimelineProject>,
  texts: SlotTexts,
): WorkPeriod {
  return {
    id: period.startedAt.toISOString(),
    start: period.startedAt,
    end: period.endedAt,
    slotCount: period.slotCount,
    // A project that is not in the list (deleted) is left out.
    projects: period.projectIds.flatMap(
      (id): WorkPeriod["projects"][number][] => {
        if (id === null)
          return [{ id: "none", name: texts.noProject, color: null }];
        const project = projects.get(id);
        return project
          ? [{ id: project.id, name: project.name, color: project.color }]
          : [];
      },
    ),
  };
}

/** The projects of the slots, each once, sorted by name. */
export function projectsOfSlots(
  slots: readonly TimelineSlot[],
): TimelineProject[] {
  const projects = new Map<number, TimelineProject>();
  for (const slot of slots) {
    const project = slot.task?.project;
    if (project && slot.task)
      projects.set(slot.task.projectId, {
        id: slot.task.projectId,
        name: project.name,
        color: project.color,
      });
  }
  return [...projects.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * The time per project and task of a day's slots, the largest first. A
 * running slot counts up to `now`.
 */
export function taskSummary(
  slots: readonly TimelineSlot[],
  now: Date,
  texts: SlotTexts,
): BreakdownProject[] {
  const projects = new Map<string, BreakdownProject>();
  for (const slot of slots) {
    const minutes =
      ((slot.endedAt ?? now).getTime() - slot.startedAt.getTime()) / MINUTE;
    if (minutes <= 0) continue;
    const projectKey = slot.task ? `p${String(slot.task.projectId)}` : "none";
    let project = projects.get(projectKey);
    if (!project) {
      project = {
        id: projectKey,
        name: slot.task?.project.name ?? texts.noProject,
        color: slotColor(slot),
        minutes: 0,
        tasks: [],
      };
      projects.set(projectKey, project);
    }
    project.minutes += minutes;
    const taskKey =
      slot.taskId === null ? slot.state : `t${String(slot.taskId)}`;
    const task = project.tasks.find((t) => t.id === taskKey);
    if (task) task.minutes += minutes;
    else
      project.tasks.push({
        id: taskKey,
        name: slotTitle(slot, texts),
        minutes,
      });
  }
  const round = (minutes: number) => Math.floor(minutes);
  return [...projects.values()]
    .map((project) => ({
      ...project,
      minutes: round(project.minutes),
      tasks: project.tasks
        .map((task) => ({ ...task, minutes: round(task.minutes) }))
        .sort((a, b) => b.minutes - a.minutes),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

/** The start and end of a draft as dates; the draft belongs to `day`. */
export function draftTimes(
  draft: SlotDraft,
  day: Date,
): { start: Date; end: Date | null } | null {
  if (!draft.start) return null;
  const start = new Date(day);
  start.setHours(draft.start.hour, draft.start.minute, 0, 0);
  if (!draft.end) return { start, end: null };
  const end = new Date(day);
  if (draft.endNextDay) end.setDate(end.getDate() + 1);
  end.setHours(draft.end.hour, draft.end.minute, 0, 0);
  return { start, end };
}

/** The input of `slot.edit`: only what the draft changes. */
export interface SlotEdit {
  id: number;
  startedAt?: Date;
  endedAt?: Date | null;
  taskId?: number | null;
}

/** The changes a draft makes to a slot; `null` when it changes nothing. */
export function slotEdit(
  slot: TimelineSlot,
  draft: SlotDraft,
): SlotEdit | null {
  const times = draftTimes(draft, slot.startedAt);
  if (!times) return null;
  const edit: SlotEdit = { id: slot.id };
  // Slots are stored in whole minutes; compare in whole minutes too.
  const same = (a: Date | null, b: Date | null) =>
    a === b ||
    (a !== null &&
      b !== null &&
      Math.floor(a.getTime() / MINUTE) === Math.floor(b.getTime() / MINUTE));
  if (!same(times.start, slot.startedAt)) edit.startedAt = times.start;
  // A running slot keeps running: its draft has no end.
  if (slot.endedAt !== null && !same(times.end, slot.endedAt))
    edit.endedAt = times.end;
  const taskId = draft.taskId === null ? null : Number(draft.taskId);
  if (taskId !== slot.taskId) edit.taskId = taskId;
  return Object.keys(edit).length > 1 ? edit : null;
}

/** A neighbour slot that moves when a draft is saved. */
export interface NeighborChange {
  slot: TimelineSlot;
  field: "startedAt" | "endedAt";
  to: Date;
}

/**
 * The neighbours that the API moves when the draft is saved, so the row
 * can say so before. The API ends the slot before at the new start, and
 * starts the slot after at the new end, when they overlap.
 */
export function neighborChanges(
  daySlots: readonly TimelineSlot[],
  times: { start: Date; end: Date | null },
  slotId: number | null,
): NeighborChange[] {
  const others = [...daySlots]
    .filter((s) => s.id !== slotId)
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
  const self = daySlots.find((s) => s.id === slotId);
  const anchor = self?.startedAt ?? times.start;
  const changes: NeighborChange[] = [];
  const before = others.filter((s) => s.startedAt < anchor).at(-1);
  if (before?.endedAt && times.start < before.endedAt)
    changes.push({ slot: before, field: "endedAt", to: times.start });
  const after = others.find((s) => s.startedAt >= anchor);
  if (after && times.end && times.end > after.startedAt)
    changes.push({ slot: after, field: "startedAt", to: times.end });
  return changes;
}

/**
 * The times offered for a new slot on a day without a free gap: after the
 * last finished slot, or 09:00–10:00 on an empty day, and never after
 * `now`. `daySlots` are all slots that lie on the day, also one from the
 * day before. `null` when a slot runs on that day, when the offer would
 * start at or after `now`, or when the day has no room left.
 */
export function newSlotTimes(
  daySlots: readonly TimelineSlot[],
  day: Date,
  now: Date,
): { start: Date; end: Date } | null {
  const midnight = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  let start: Date;
  let end: Date;
  if (daySlots.length === 0) {
    start = new Date(midnight);
    start.setHours(9);
    end = new Date(midnight);
    end.setHours(10);
  } else {
    if (daySlots.some((s) => s.endedAt === null)) return null;
    start = new Date(
      Math.max(...daySlots.map((s) => s.endedAt?.getTime() ?? 0)),
    );
    start.setSeconds(0, 0);
    const latest = addDays(midnight, 1);
    latest.setMinutes(-1);
    if (start >= latest) return null;
    end = new Date(Math.min(start.getTime() + 30 * MINUTE, latest.getTime()));
  }
  const cut = new Date(now);
  cut.setSeconds(0, 0);
  if (start >= cut) return null;
  if (end > cut) end = cut;
  return { start, end };
}

/**
 * The work periods that lie on `day` at least in part: a period across
 * midnight shows on both days. A running period lasts until `now`.
 */
export function periodsOverlapping(
  periods: readonly TimelinePeriod[],
  day: Date,
  now: Date,
): TimelinePeriod[] {
  const from = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const to = addDays(from, 1);
  return periods.filter((p) => p.startedAt < to && (p.endedAt ?? now) > from);
}

/**
 * The range to load for the week that starts on `weekStart`. It starts a
 * day early, so a slot from Sunday night that runs into Monday is there.
 */
export function weekQueryRange(weekStart: Date): { from: Date; to: Date } {
  const to = addDays(weekStart, 7);
  return { from: addDays(weekStart, -1), to: new Date(to.getTime() - 1) };
}
