/**
 * Invented sample data for the timeline stories: the week of 5 to 11
 * October 2026, "now" on Thursday at 11:42.
 */
import type { DayBarsBlock, DayBarsDay } from "./DayBars";
import type { TaskPickerProject, TaskPickerTask } from "./TaskPicker";

export const projects: TaskPickerProject[] = [
  { id: 1, name: "Intern", color: "project-1" },
  { id: 2, name: "Nordlicht", color: "project-2" },
  { id: 3, name: "Kranich", color: "project-7" },
  { id: 4, name: "Leuchtturm", color: "project-8" },
  { id: 5, name: "Werkbank", color: "project-6" },
];

export const tasks: TaskPickerTask[] = [
  { id: 11, name: "Post lesen", projectId: 1, trackedMinutes: 52 },
  { id: 12, name: "Tag planen", projectId: 1, trackedMinutes: 140 },
  { id: 13, name: "Teamrunde", projectId: 1, trackedMinutes: 75 },
  { id: 21, name: "Karten zeichnen", projectId: 2, trackedMinutes: 610 },
  { id: 22, name: "Kick-Off", projectId: 2, trackedMinutes: 85 },
  { id: 31, name: "Adapter anbinden", projectId: 3, trackedMinutes: 480 },
  { id: 32, name: "Routen prüfen", projectId: 3, trackedMinutes: 65 },
  { id: 41, name: "Werkzeuge testen", projectId: 4, trackedMinutes: 131 },
  { id: 51, name: "Workshop vorbereiten", projectId: 5, trackedMinutes: 75 },
];

/** A local time in the sample week; `day` is the day of October. */
export const at = (day: number, time: string) => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  return new Date(2026, 9, day, hours, minutes);
};

/** Thursday, 8 October 2026, 11:42. */
export const now = at(8, "11:42");

/** A slot as the stories use it: times, task and its project. */
export interface SampleSlot {
  id: number;
  start: Date;
  end: Date | null;
  taskId: number;
}

let nextId = 1;

/** Slots of one day from `[from, to, taskId]`; `to: null` runs. */
export function daySlots(
  day: number,
  list: [string, string | null, number][],
): SampleSlot[] {
  return list.map(([from, to, taskId]) => ({
    id: nextId++,
    start: at(day, from),
    end: to === null ? null : at(day, to),
    taskId,
  }));
}

export const week: Record<number, SampleSlot[]> = {
  5: daySlots(5, [
    ["09:05", "09:12", 11],
    ["09:12", "10:00", 31],
    ["10:00", "10:20", 13],
    ["10:20", "12:20", 31],
    ["13:30", "17:35", 32],
    ["17:35", "17:58", 12],
  ]),
  6: daySlots(6, [
    ["09:05", "09:15", 51],
    ["09:15", "09:25", 11],
    ["09:25", "10:40", 51],
    ["10:40", "12:05", 12],
    ["12:15", "12:35", 51],
    ["13:25", "15:30", 41],
    ["15:30", "15:33", 51],
    ["15:33", "17:55", 21],
  ]),
  7: daySlots(7, [
    ["09:20", "09:27", 11],
    ["09:27", "10:16", 12],
    ["10:16", "10:50", 41],
    ["10:50", "12:02", 21],
    ["13:05", "14:19", 21],
    ["14:19", "14:33", 22],
    ["14:33", "16:49", 22],
    ["16:49", "18:12", 21],
  ]),
  8: daySlots(8, [
    ["09:10", "09:18", 11],
    ["09:18", "10:05", 21],
    ["10:05", null, 41],
  ]),
};

const taskById = new Map(tasks.map((task) => [task.id, task]));
const projectById = new Map(projects.map((project) => [project.id, project]));

/** The task and project of a sample slot. */
export function taskOf(taskId: number) {
  const task = taskById.get(taskId);
  const project = task ? projectById.get(task.projectId) : undefined;
  return { task, project };
}

/** A sample slot as a block of the day bars. */
function toBlock(slot: SampleSlot): DayBarsBlock {
  const { task, project } = taskOf(slot.taskId);
  return {
    id: slot.id,
    start: slot.start,
    end: slot.end,
    title: task?.name ?? "Ohne Aufgabe",
    subtitle: project?.name,
    color: project?.color,
  };
}

/** Monday to Friday of the sample week with the given slots per day. */
export function weekDays(slots: Record<number, SampleSlot[]>): DayBarsDay[] {
  return [5, 6, 7, 8, 9].map((day) => ({
    id: `2026-10-${String(day).padStart(2, "0")}`,
    date: at(day, "00:00"),
    blocks: (slots[day] ?? []).map(toBlock),
  }));
}

/** Contiguous slots merged into work periods, as `packages/core` will do. */
export function mergePeriods(slots: readonly SampleSlot[]) {
  const periods: { start: Date; end: Date | null; slots: SampleSlot[] }[] = [];
  for (const slot of [...slots].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  )) {
    const last = periods.at(-1);
    if (last?.end && last.end.getTime() >= slot.start.getTime()) {
      last.slots.push(slot);
      // A running slot keeps the period running.
      if (!slot.end) last.end = null;
      else if (slot.end.getTime() > last.end.getTime()) last.end = slot.end;
    } else {
      periods.push({ start: slot.start, end: slot.end, slots: [slot] });
    }
  }
  return periods;
}
