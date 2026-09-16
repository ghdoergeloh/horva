import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { db } from "@horva/db/client";

import {
  createProjectFixture,
  createTaskFixture,
  resetDb,
} from "../test-support/db.js";
import { getLog, getPeriodRange, getSummary } from "./log.service.js";
import { insertSlot } from "./slot.service.js";

beforeEach(async () => {
  await resetDb(db);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await db.close();
});

// getPeriodRange works in the machine's local timezone (by design — "today"
// means the user's wall-clock day), so assertions compare local date parts
// rather than toISOString(), which would shift by the local UTC offset.
function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

describe("getPeriodRange", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // A Wednesday, so week boundaries (Mon..Sun) are unambiguous. Local noon
    // keeps this the same calendar day across any reasonable local UTC offset.
    vi.setSystemTime(new Date(2026, 5, 17, 12, 0, 0));
  });

  it("today spans the current day", () => {
    const { from, to } = getPeriodRange("today");
    expect(localDateStr(from)).toBe("2026-06-17");
    expect(localDateStr(to)).toBe("2026-06-17");
  });

  it("yesterday spans the previous day", () => {
    const { from } = getPeriodRange("yesterday");
    expect(localDateStr(from)).toBe("2026-06-16");
  });

  it("week spans Monday through Sunday", () => {
    const { from, to } = getPeriodRange("week");
    expect(from.getDay()).toBe(1); // Monday
    expect(to.getDay()).toBe(0); // Sunday
    expect(localDateStr(from)).toBe("2026-06-15");
    expect(localDateStr(to)).toBe("2026-06-21");
  });

  it("month spans the full calendar month", () => {
    const { from, to } = getPeriodRange("month");
    expect(localDateStr(from)).toBe("2026-06-01");
    expect(localDateStr(to)).toBe("2026-06-30");
  });

  it("all spans everything", () => {
    const { from, to } = getPeriodRange("all");
    expect(from.getTime()).toBe(0);
    expect(to.getFullYear()).toBeGreaterThan(9000);
  });
});

describe("getLog", () => {
  it("only returns closed slots within range, oldest first", async () => {
    const project = await createProjectFixture(db);
    const task = await createTaskFixture(db, project.id);

    await insertSlot(
      db,
      new Date("2026-06-10T09:00:00.000Z"),
      new Date("2026-06-10T10:00:00.000Z"),
      task.id,
    );
    await insertSlot(
      db,
      new Date("2026-06-10T08:00:00.000Z"),
      new Date("2026-06-10T08:30:00.000Z"),
      task.id,
    );
    // Outside the range.
    await insertSlot(
      db,
      new Date("2026-01-01T09:00:00.000Z"),
      new Date("2026-01-01T10:00:00.000Z"),
      task.id,
    );
    // Still open — must be excluded even though its start is in range.
    await insertSlot(db, new Date("2026-06-10T11:00:00.000Z"), null, task.id);

    const rows = await getLog(db, {
      from: new Date("2026-06-10T00:00:00.000Z"),
      to: new Date("2026-06-10T23:59:59.999Z"),
    });

    expect(rows).toHaveLength(2);
    expect(rows[0]?.startedAt).toEqual(new Date("2026-06-10T08:00:00.000Z"));
    expect(rows[1]?.startedAt).toEqual(new Date("2026-06-10T09:00:00.000Z"));
  });
});

describe("getSummary", () => {
  it("aggregates minutes per project and per task", async () => {
    const project = await createProjectFixture(db, { name: "Client A" });
    const taskA = await createTaskFixture(db, project.id, { name: "Design" });
    const taskB = await createTaskFixture(db, project.id, {
      name: "Review",
    });

    await insertSlot(
      db,
      new Date("2026-06-10T09:00:00.000Z"),
      new Date("2026-06-10T10:00:00.000Z"),
      taskA.id,
    );
    await insertSlot(
      db,
      new Date("2026-06-10T10:00:00.000Z"),
      new Date("2026-06-10T10:30:00.000Z"),
      taskA.id,
    );
    await insertSlot(
      db,
      new Date("2026-06-10T11:00:00.000Z"),
      new Date("2026-06-10T11:15:00.000Z"),
      taskB.id,
    );
    // no_task time should get its own bucket, not vanish.
    await insertSlot(
      db,
      new Date("2026-06-10T12:00:00.000Z"),
      new Date("2026-06-10T12:20:00.000Z"),
    );

    const summary = await getSummary(db, {
      from: new Date("2026-06-10T00:00:00.000Z"),
      to: new Date("2026-06-10T23:59:59.999Z"),
    });

    const projectEntry = summary.find((e) => e.projectId === project.id);
    expect(projectEntry?.totalMinutes).toBe(105);
    const tasks = projectEntry?.tasks;
    expect(tasks).toEqual([
      { taskId: taskA.id, taskName: "Design", minutes: 90 },
      { taskId: taskB.id, taskName: "Review", minutes: 15 },
    ]);

    const noTaskEntry = summary.find((e) => e.projectId === null);
    expect(noTaskEntry?.totalMinutes).toBe(20);
    expect(noTaskEntry?.tasks).toEqual([]);
  });
});
