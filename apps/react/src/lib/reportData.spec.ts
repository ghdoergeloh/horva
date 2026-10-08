import { CalendarDate } from "@internationalized/date";
import { describe, expect, it } from "vitest";

import type { ReportSlot, SummaryEntry } from "./reportData";
import {
  breakdownProjects,
  chartProjects,
  dayEntries,
  daysWithTime,
  donutProjects,
  shares,
  sortEntries,
  taskIdsWithLabel,
} from "./reportData";

const summary: SummaryEntry[] = [
  {
    projectId: null,
    projectName: "(no task)",
    projectColor: "project-2",
    totalMinutes: 300,
    tasks: [],
  },
  {
    projectId: 1,
    projectName: "Kranich",
    projectColor: "project-7",
    totalMinutes: 90,
    tasks: [
      { taskId: 11, taskName: "Review", minutes: 60 },
      { taskId: 12, taskName: "Meeting", minutes: 30 },
    ],
  },
  {
    projectId: 2,
    projectName: "Intern",
    projectColor: "project-1",
    totalMinutes: 120,
    tasks: [{ taskId: 21, taskName: "Planning", minutes: 120 }],
  },
];

function slot(
  start: string,
  end: string | null,
  task: { id: number; project: number; labels?: number[] } | null,
): ReportSlot {
  return {
    startedAt: start,
    endedAt: end,
    task: task && {
      id: task.id,
      project: { id: task.project },
      taskLabels: (task.labels ?? []).map((id) => ({ label: { id } })),
    },
  };
}

describe("sortEntries", () => {
  it("puts the largest first and time without a task last", () => {
    expect(sortEntries(summary).map((entry) => entry.projectId)).toEqual([
      2,
      1,
      null,
    ]);
  });

  it("leaves the input unchanged", () => {
    sortEntries(summary);
    expect(summary[0]?.projectId).toBeNull();
  });
});

describe("donutProjects", () => {
  it("names time without a task and gives it no project color", () => {
    expect(donutProjects(summary, "Ohne Aufgabe")).toEqual([
      {
        id: 2,
        name: "Intern",
        color: "project-1",
        minutes: 120,
        isWithoutTask: false,
      },
      {
        id: 1,
        name: "Kranich",
        color: "project-7",
        minutes: 90,
        isWithoutTask: false,
      },
      {
        id: "none",
        name: "Ohne Aufgabe",
        color: null,
        minutes: 300,
        isWithoutTask: true,
      },
    ]);
  });
});

describe("chartProjects", () => {
  it("uses the same keys and order as the donut", () => {
    expect(chartProjects(summary, "Ohne Aufgabe").map((p) => p.id)).toEqual([
      2,
      1,
      "none",
    ]);
  });
});

describe("breakdownProjects", () => {
  it("keeps all tasks without a filter", () => {
    const rows = breakdownProjects(summary, "Ohne Aufgabe");
    expect(rows.map((row) => [row.id, row.minutes, row.tasks.length])).toEqual([
      [2, 120, 1],
      [1, 90, 2],
      ["none", 300, 0],
    ]);
  });

  it("keeps only the given tasks and sums their time", () => {
    const rows = breakdownProjects(summary, "Ohne Aufgabe", new Set([12]));
    expect(rows).toEqual([
      {
        id: 1,
        name: "Kranich",
        color: "project-7",
        minutes: 30,
        tasks: [{ id: 12, name: "Meeting", minutes: 30 }],
      },
    ]);
  });
});

describe("taskIdsWithLabel", () => {
  it("finds the tasks that carry the label", () => {
    const slots = [
      slot("2026-06-01T08:00:00Z", "2026-06-01T09:00:00Z", {
        id: 11,
        project: 1,
        labels: [5],
      }),
      slot("2026-06-01T09:00:00Z", "2026-06-01T10:00:00Z", {
        id: 12,
        project: 1,
        labels: [6],
      }),
      slot("2026-06-01T10:00:00Z", "2026-06-01T11:00:00Z", null),
    ];
    expect([...taskIdsWithLabel(slots, 5)]).toEqual([11]);
  });
});

describe("dayEntries", () => {
  const range = {
    start: new CalendarDate(2026, 6, 1),
    end: new CalendarDate(2026, 6, 3),
  };
  const label = (date: CalendarDate) => ({
    label: String(date.day),
    fullLabel: date.toString(),
  });

  it("lists every day of the range, empty days included", () => {
    const days = dayEntries([], range, "Europe/Berlin", label);
    expect(days.map((day) => [day.date, day.label, day.minutes])).toEqual([
      ["2026-06-01", "1", []],
      ["2026-06-02", "2", []],
      ["2026-06-03", "3", []],
    ]);
    expect(daysWithTime(days)).toBe(0);
  });

  it("adds closed slots per project on the local start day", () => {
    const slots = [
      slot("2026-06-01T06:00:00Z", "2026-06-01T07:30:00Z", {
        id: 11,
        project: 1,
      }),
      slot("2026-06-01T08:00:00Z", "2026-06-01T08:30:00Z", {
        id: 12,
        project: 1,
      }),
      // 23:30 on 1 June in UTC is already 2 June in Berlin.
      slot("2026-06-01T23:30:00Z", "2026-06-02T00:15:00Z", null),
      // A running slot has no time yet.
      slot("2026-06-03T08:00:00Z", null, { id: 21, project: 2 }),
    ];
    const days = dayEntries(slots, range, "Europe/Berlin", label);
    expect(days.map((day) => day.minutes)).toEqual([
      [{ projectId: 1, minutes: 120 }],
      [{ projectId: "none", minutes: 45 }],
      [],
    ]);
    expect(daysWithTime(days)).toBe(2);
  });

  it("passes the number of days to the label", () => {
    const counts: number[] = [];
    dayEntries([], range, "UTC", (date, count) => {
      counts.push(count);
      return label(date);
    });
    expect(counts).toEqual([3, 3, 3]);
  });
});

function entry(projectId: number | null, totalMinutes: number): SummaryEntry {
  return {
    projectId,
    projectName: projectId === null ? "(no task)" : `P${String(projectId)}`,
    projectColor: "project-1",
    totalMinutes,
    tasks: [],
  };
}

describe("shares", () => {
  it("rounds like the ring, so the percents add up to 100", () => {
    const result = shares([entry(1, 60), entry(2, 60), entry(3, 60)]);
    // 33.3 % each; the ring gives the remainder to the first.
    expect(result.largest?.entry.projectId).toBe(1);
    expect(result.largest?.percent).toBe(34);
    expect(result.withoutTaskPercent).toBe(0);
  });

  it("skips time without a task for the largest project", () => {
    const result = shares([entry(null, 300), entry(1, 90), entry(2, 120)]);
    expect(result.largest?.entry.projectId).toBe(2);
    expect(result.largest?.percent).toBe(23);
    expect(result.withoutTaskPercent).toBe(59);
  });

  it("groups the smallest projects as the ring does", () => {
    // Nine projects: the ring keeps seven and groups two into "Others".
    const nine = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((id) => entry(id, 10));
    nine[0] = entry(1, 15);
    const result = shares(nine);
    // 15 of 95 minutes is 15.8 %; rounded with the "Others" slice, it is 16.
    expect(result.largest?.percent).toBe(16);
  });

  it("has no largest project without time", () => {
    expect(shares([entry(null, 30)])).toEqual({
      largest: undefined,
      withoutTaskPercent: 100,
    });
    expect(shares([])).toEqual({ largest: undefined, withoutTaskPercent: 0 });
  });
});
