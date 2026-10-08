import { describe, expect, it } from "vitest";

import type { TimelinePeriod, TimelineSlot } from "./timeline";
import {
  draftTimes,
  neighborChanges,
  newSlotTimes,
  projectsOfSlots,
  slotColor,
  slotEdit,
  slotsOverlapping,
  slotsStartingOn,
  startOfWeek,
  taskSummary,
  toTableSlot,
  toWorkPeriod,
  weekDays,
} from "./timeline";

const texts = {
  noTask: "No task",
  deletedTask: "Deleted task",
  noProject: "No project",
};

/** 8 October 2026 (a Thursday) at a clock time such as `9:20`. */
function at(clock: string, day = 8): Date {
  const [h, m] = clock.split(":").map(Number);
  return new Date(2026, 9, day, h, m);
}

let nextId = 1;

/** A slot of the API; `task` is `[taskId, name, projectId, project, color]`. */
function slot(
  start: Date,
  end: Date | null,
  task?: [number, string, number, string, string],
  state: TimelineSlot["state"] = task ? "active" : "no_task",
): TimelineSlot {
  return {
    id: nextId++,
    startedAt: start,
    endedAt: end,
    taskId: task ? task[0] : null,
    state,
    createdAt: start,
    task: task && {
      id: task[0],
      name: task[1],
      projectId: task[2],
      project: { id: task[2], name: task[3], color: task[4] },
    },
  } as TimelineSlot;
}

const docs: [number, string, number, string, string] = [
  1,
  "Write docs",
  10,
  "Nordlicht",
  "project-3",
];
const call: [number, string, number, string, string] = [
  2,
  "Call",
  11,
  "Kranich",
  "project-7",
];

describe("startOfWeek and weekDays", () => {
  it("starts the week on Monday at midnight", () => {
    expect(startOfWeek(at("15:30"))).toEqual(new Date(2026, 9, 5));
    expect(startOfWeek(new Date(2026, 9, 11, 23))).toEqual(
      new Date(2026, 9, 5),
    );
    expect(startOfWeek(new Date(2026, 9, 5))).toEqual(new Date(2026, 9, 5));
  });

  it("lists seven days", () => {
    const days = weekDays(new Date(2026, 9, 5));
    expect(days).toHaveLength(7);
    expect(days[6]).toEqual(new Date(2026, 9, 11));
  });
});

describe("slots of a day", () => {
  const night = slot(at("22:00", 7), at("01:30", 8), docs);
  const morning = slot(at("09:00"), at("10:00"), docs);
  const running = slot(at("11:00"), null, call);

  it("shows a slot across midnight on both days", () => {
    const now = at("12:00");
    expect(slotsOverlapping([night, morning], at("0:00", 7), now)).toEqual([
      night,
    ]);
    expect(slotsOverlapping([night, morning], at("0:00"), now)).toEqual([
      night,
      morning,
    ]);
  });

  it("counts a running slot up to now", () => {
    expect(slotsOverlapping([running], at("0:00"), at("12:00"))).toEqual([
      running,
    ]);
    expect(slotsOverlapping([running], at("0:00", 9), at("12:00"))).toEqual([]);
  });

  it("puts a slot in the table of the day it starts on, sorted", () => {
    expect(slotsStartingOn([running, night, morning], at("0:00"))).toEqual([
      morning,
      running,
    ]);
  });
});

describe("toTableSlot and slotColor", () => {
  it("names the task and the project", () => {
    expect(toTableSlot(slot(at("9:00"), at("10:00"), docs), texts)).toEqual(
      expect.objectContaining({
        taskId: 1,
        task: "Write docs",
        project: { name: "Nordlicht", color: "project-3" },
      }),
    );
  });

  it("leaves a slot without a task empty", () => {
    const row = toTableSlot(slot(at("9:00"), at("10:00")), texts);
    expect(row.task).toBeNull();
    expect(row.project).toBeNull();
  });

  it("names a deleted task and colors it as deleted", () => {
    const deleted = slot(at("9:00"), at("10:00"), undefined, "task_deleted");
    expect(toTableSlot(deleted, texts).task).toBe("Deleted task");
    expect(slotColor(deleted)).toBe("project-deleted");
    expect(slotColor(slot(at("9:00"), at("10:00")))).toBeNull();
    expect(slotColor(slot(at("9:00"), at("10:00"), call))).toBe("project-7");
  });
});

describe("projectsOfSlots", () => {
  it("lists each project once, by name", () => {
    expect(
      projectsOfSlots([
        slot(at("9:00"), at("10:00"), docs),
        slot(at("10:00"), at("11:00"), call),
        slot(at("11:00"), at("12:00"), docs),
        slot(at("12:00"), at("13:00")),
      ]).map((p) => p.name),
    ).toEqual(["Kranich", "Nordlicht"]);
  });
});

describe("taskSummary", () => {
  it("sums the time per project and task, the largest first", () => {
    const summary = taskSummary(
      [
        slot(at("9:00"), at("9:30"), docs),
        slot(at("9:30"), at("10:00"), call),
        slot(at("10:00"), at("10:15"), docs),
        slot(at("10:15"), at("10:20")),
      ],
      at("12:00"),
      texts,
    );
    expect(summary.map((p) => [p.name, p.minutes])).toEqual([
      ["Nordlicht", 45],
      ["Kranich", 30],
      ["No project", 5],
    ]);
    expect(summary[2]?.tasks).toEqual([
      { id: "no_task", name: "No task", minutes: 5 },
    ]);
  });

  it("counts a running slot up to now (#75)", () => {
    const summary = taskSummary(
      [slot(at("9:00"), null, docs)],
      at("10:20"),
      texts,
    );
    expect(summary[0]?.minutes).toBe(80);
  });
});

describe("draftTimes", () => {
  const draft = {
    start: { hour: 9, minute: 20 },
    end: { hour: 10, minute: 16 },
    endNextDay: false,
    taskId: null,
  };

  it("puts the clock times on the day", () => {
    expect(draftTimes(draft, at("0:00"))).toEqual({
      start: at("9:20"),
      end: at("10:16"),
    });
  });

  it("puts an end before the start on the next day", () => {
    expect(
      draftTimes(
        {
          ...draft,
          start: { hour: 22, minute: 0 },
          end: { hour: 1, minute: 0 },
          endNextDay: true,
        },
        at("0:00"),
      ),
    ).toEqual({ start: at("22:00"), end: at("1:00", 9) });
  });

  it("keeps a running draft without end, and needs a start", () => {
    expect(draftTimes({ ...draft, end: null }, at("0:00"))).toEqual({
      start: at("9:20"),
      end: null,
    });
    expect(draftTimes({ ...draft, start: null }, at("0:00"))).toBeNull();
  });
});

describe("slotEdit", () => {
  const finished = slot(at("9:20"), at("10:16"), docs);
  const draft = {
    start: { hour: 9, minute: 20 },
    end: { hour: 10, minute: 16 },
    endNextDay: false,
    taskId: 1 as string | number | null,
  };

  it("sends nothing when nothing changed", () => {
    expect(slotEdit(finished, draft)).toBeNull();
  });

  it("sends only the changed fields", () => {
    expect(
      slotEdit(finished, { ...draft, end: { hour: 10, minute: 30 } }),
    ).toEqual({ id: finished.id, endedAt: at("10:30") });
    expect(slotEdit(finished, { ...draft, taskId: "2" })).toEqual({
      id: finished.id,
      taskId: 2,
    });
    expect(slotEdit(finished, { ...draft, taskId: null })).toEqual({
      id: finished.id,
      taskId: null,
    });
  });

  it("keeps a running slot running", () => {
    const running = slot(at("11:00"), null, docs);
    expect(
      slotEdit(running, {
        ...draft,
        start: { hour: 10, minute: 45 },
        end: null,
      }),
    ).toEqual({ id: running.id, startedAt: at("10:45") });
  });

  it("ignores the seconds of a stored time", () => {
    const withSeconds = slot(
      new Date(2026, 9, 8, 9, 20, 30),
      at("10:16"),
      docs,
    );
    expect(slotEdit(withSeconds, draft)).toBeNull();
  });
});

describe("neighborChanges", () => {
  const first = slot(at("9:00"), at("10:00"), docs);
  const second = slot(at("10:00"), at("11:00"), call);
  const third = slot(at("11:00"), at("12:00"), docs);
  const day = [first, second, third];

  it("moves the end of the slot before an earlier start", () => {
    expect(
      neighborChanges(day, { start: at("9:45"), end: at("11:00") }, second.id),
    ).toEqual([{ slot: first, field: "endedAt", to: at("9:45") }]);
  });

  it("moves the start of the slot after a later end", () => {
    expect(
      neighborChanges(day, { start: at("10:00"), end: at("11:10") }, second.id),
    ).toEqual([{ slot: third, field: "startedAt", to: at("11:10") }]);
  });

  it("finds nothing when the slot stays inside its gap", () => {
    expect(
      neighborChanges(day, { start: at("10:05"), end: at("10:55") }, second.id),
    ).toEqual([]);
  });

  it("checks both neighbours of a new slot", () => {
    const gappy = [first, third];
    expect(
      neighborChanges(gappy, { start: at("9:50"), end: at("11:05") }, null),
    ).toEqual([
      { slot: first, field: "endedAt", to: at("9:50") },
      { slot: third, field: "startedAt", to: at("11:05") },
    ]);
  });
});

describe("newSlotTimes", () => {
  it("offers 09:00 to 10:00 on an empty day", () => {
    expect(newSlotTimes([], at("0:00"))).toEqual({
      start: at("9:00"),
      end: at("10:00"),
    });
  });

  it("offers half an hour after the last finished slot", () => {
    expect(
      newSlotTimes(
        [
          slot(at("9:00"), at("10:00")),
          slot(new Date(2026, 9, 8, 10, 30), new Date(2026, 9, 8, 12, 5, 40)),
        ],
        at("0:00"),
      ),
    ).toEqual({ start: at("12:05"), end: at("12:35") });
  });

  it("stops at the end of the day", () => {
    expect(newSlotTimes([slot(at("20:00"), at("23:50"))], at("0:00"))).toEqual({
      start: at("23:50"),
      end: at("23:59"),
    });
    expect(newSlotTimes([slot(at("20:00"), at("23:59"))], at("0:00"))).toBe(
      null,
    );
    expect(
      newSlotTimes([slot(at("20:00"), at("1:00", 9))], at("0:00")),
    ).toBeNull();
  });

  it("offers nothing while a slot of the day runs", () => {
    expect(newSlotTimes([slot(at("9:00"), null)], at("0:00"))).toBeNull();
  });
});

describe("toWorkPeriod", () => {
  it("names the projects of a period and leaves out unknown ones", () => {
    const period: TimelinePeriod = {
      startedAt: at("9:20"),
      endedAt: null,
      minutes: 56,
      slotCount: 3,
      projectIds: [10, null, 99],
    };
    const projects = new Map([
      [10, { id: 10, name: "Nordlicht", color: "project-3" }],
    ]);
    expect(toWorkPeriod(period, projects, texts)).toEqual({
      id: at("9:20").toISOString(),
      start: at("9:20"),
      end: null,
      slotCount: 3,
      projects: [
        { id: 10, name: "Nordlicht", color: "project-3" },
        { id: "none", name: "No project", color: null },
      ],
    });
  });
});
