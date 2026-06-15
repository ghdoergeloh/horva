import { describe, expect, it } from "vitest";

import type { Db } from "@horva/db/client";

import { buildSyncPreview, getTaskMapping } from "./moco.service.js";

// Minimal slot-with-task shape getLog returns (only the fields the preview
// reads). Each slot belongs to a project that may or may not be Moco-linked.
interface FakeSlot {
  startedAt: Date;
  endedAt: Date | null;
  task: {
    id: number;
    name: string;
    project: {
      id: number;
      name: string;
      mocoProjectId: number | null;
      mocoDefaultTaskId: number | null;
    };
  } | null;
}

function makeDb(
  slots: FakeSlot[],
  overrides: { taskId: number; mocoTaskId: number }[] = [],
): Db {
  return {
    query: {
      slot: {
        // getLog applies a where on startedAt/endedAt; our fakes are already
        // in-range and ended, so just return them.
        findMany: () => Promise.resolve(slots),
      },
      taskMocoMapping: {
        findMany: () => Promise.resolve(overrides),
      },
    },
  } as unknown as Db;
}

const linkedProject = {
  id: 1,
  name: "Alpha",
  mocoProjectId: 100,
  mocoDefaultTaskId: 900,
};

const range = {
  from: new Date("2026-06-01T00:00:00"),
  to: new Date("2026-06-30T23:59:59"),
};

function slot(start: string, end: string, task: FakeSlot["task"]): FakeSlot {
  return { startedAt: new Date(start), endedAt: new Date(end), task };
}

describe("buildSyncPreview", () => {
  it("sums multiple slots of the same task on the same day into one line", async () => {
    const task = { id: 10, name: "Build", project: linkedProject };
    const db = makeDb([
      slot("2026-06-10T09:00:00", "2026-06-10T10:00:00", task), // 3600s
      slot("2026-06-10T11:00:00", "2026-06-10T11:30:00", task), // 1800s
    ]);

    const lines = await buildSyncPreview(db, range);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      date: "2026-06-10",
      taskId: 10,
      seconds: 5400,
      status: "syncable",
      mocoProjectId: 100,
      mocoTaskId: 900,
    });
  });

  it("splits the same task across different days", async () => {
    const task = { id: 10, name: "Build", project: linkedProject };
    const db = makeDb([
      slot("2026-06-10T23:30:00", "2026-06-11T00:00:00", task),
      slot("2026-06-11T08:00:00", "2026-06-11T09:00:00", task),
    ]);

    const lines = await buildSyncPreview(db, range);

    expect(lines.map((l) => l.date)).toEqual(["2026-06-10", "2026-06-11"]);
  });

  it("uses the per-task override over the project default", async () => {
    const task = { id: 10, name: "Build", project: linkedProject };
    const db = makeDb(
      [slot("2026-06-10T09:00:00", "2026-06-10T10:00:00", task)],
      [{ taskId: 10, mocoTaskId: 555 }],
    );

    const lines = await buildSyncPreview(db, range);

    expect(lines[0]?.mocoTaskId).toBe(555);
  });

  it("skips slots without a task as no_task", async () => {
    const db = makeDb([
      slot("2026-06-10T09:00:00", "2026-06-10T10:00:00", null),
    ]);

    const lines = await buildSyncPreview(db, range);

    expect(lines[0]).toMatchObject({ status: "skipped", reason: "no_task" });
  });

  it("skips when the project is not Moco-linked", async () => {
    const task = {
      id: 11,
      name: "Misc",
      project: {
        id: 2,
        name: "Beta",
        mocoProjectId: null,
        mocoDefaultTaskId: null,
      },
    };
    const db = makeDb([
      slot("2026-06-10T09:00:00", "2026-06-10T10:00:00", task),
    ]);

    const lines = await buildSyncPreview(db, range);

    expect(lines[0]).toMatchObject({
      status: "skipped",
      reason: "project_not_linked",
    });
  });

  it("skips when no default activity and no override exist", async () => {
    const task = {
      id: 12,
      name: "Orphan",
      project: {
        id: 3,
        name: "Gamma",
        mocoProjectId: 300,
        mocoDefaultTaskId: null,
      },
    };
    const db = makeDb([
      slot("2026-06-10T09:00:00", "2026-06-10T10:00:00", task),
    ]);

    const lines = await buildSyncPreview(db, range);

    expect(lines[0]).toMatchObject({
      status: "skipped",
      reason: "no_task_mapping",
    });
  });

  it("ignores running (not yet ended) slots", async () => {
    const task = { id: 10, name: "Build", project: linkedProject };
    const db = makeDb([
      { startedAt: new Date("2026-06-10T09:00:00"), endedAt: null, task },
    ]);

    const lines = await buildSyncPreview(db, range);

    expect(lines).toHaveLength(0);
  });
});

describe("getTaskMapping", () => {
  function dbWith(row: { taskId: number; mocoTaskId: number } | undefined): Db {
    return {
      query: {
        taskMocoMapping: { findFirst: () => Promise.resolve(row) },
      },
    } as unknown as Db;
  }

  it("returns null when no override exists", async () => {
    expect(await getTaskMapping(dbWith(undefined), 10)).toEqual({
      mocoTaskId: null,
    });
  });

  it("returns the mapped mocoTaskId when an override exists", async () => {
    expect(
      await getTaskMapping(dbWith({ taskId: 10, mocoTaskId: 555 }), 10),
    ).toEqual({ mocoTaskId: 555 });
  });
});
