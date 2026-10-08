import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Database } from "@horva/db/client";
import type { TestDatabase } from "@horva/db/testing";
import { createTestDatabase } from "@horva/db/testing";

import { createProjectFixture, createTaskFixture } from "../test-support/db.js";
import { insertSlot } from "./slot.service.js";
import { getWorkPeriods, mergeWorkPeriods } from "./work-period.service.js";

const at = (hhmm: string, day = 7) => new Date(`2026-10-0${day}T${hhmm}:00`);

describe("mergeWorkPeriods", () => {
  it("joins slots that touch and splits at a break", () => {
    const periods = mergeWorkPeriods(
      [
        { startedAt: at("09:20"), endedAt: at("09:27"), projectId: 1 },
        { startedAt: at("09:27"), endedAt: at("10:16"), projectId: 2 },
        { startedAt: at("10:45"), endedAt: at("12:02"), projectId: 1 },
      ],
      at("18:00"),
    );
    expect(periods).toEqual([
      {
        startedAt: at("09:20"),
        endedAt: at("10:16"),
        minutes: 56,
        slotCount: 2,
        projectIds: [1, 2],
      },
      {
        startedAt: at("10:45"),
        endedAt: at("12:02"),
        minutes: 77,
        slotCount: 1,
        projectIds: [1],
      },
    ]);
  });

  it("joins slots with a gap of less than a minute", () => {
    const periods = mergeWorkPeriods(
      [
        {
          startedAt: at("09:00"),
          endedAt: new Date(at("10:00").getTime() - 30_000),
          projectId: null,
        },
        { startedAt: at("10:00"), endedAt: at("11:00"), projectId: null },
      ],
      at("18:00"),
    );
    expect(periods).toHaveLength(1);
    expect(periods[0]?.projectIds).toEqual([null]);
  });

  it("keeps a running slot open and counts it up to now", () => {
    const periods = mergeWorkPeriods(
      [
        { startedAt: at("13:05"), endedAt: at("14:00"), projectId: 1 },
        { startedAt: at("14:00"), endedAt: null, projectId: 1 },
      ],
      at("15:30"),
    );
    expect(periods).toEqual([
      {
        startedAt: at("13:05"),
        endedAt: null,
        minutes: 145,
        slotCount: 2,
        projectIds: [1],
      },
    ]);
  });

  it("does not join slots of different days", () => {
    const periods = mergeWorkPeriods(
      [
        { startedAt: at("22:00", 6), endedAt: at("00:00", 7), projectId: 1 },
        { startedAt: at("00:00", 7), endedAt: at("01:00", 7), projectId: 1 },
      ],
      at("18:00"),
    );
    expect(periods).toHaveLength(2);
  });

  it("sorts the slots by start first", () => {
    const periods = mergeWorkPeriods(
      [
        { startedAt: at("10:00"), endedAt: at("11:00"), projectId: 1 },
        { startedAt: at("09:00"), endedAt: at("10:00"), projectId: 1 },
      ],
      at("18:00"),
    );
    expect(periods).toHaveLength(1);
    expect(periods[0]?.startedAt).toEqual(at("09:00"));
  });

  it("returns nothing without slots", () => {
    expect(mergeWorkPeriods([], at("18:00"))).toEqual([]);
  });
});

describe("getWorkPeriods", () => {
  let testDb: TestDatabase;
  let db: Database;

  beforeEach(async () => {
    testDb = await createTestDatabase();
    db = testDb.db;
  });

  afterEach(async () => {
    await testDb.close();
  });

  it("reads the slots of the range, the running one included", async () => {
    const project = await createProjectFixture(db, { name: "Intern" });
    const task = await createTaskFixture(db, project.id);
    await insertSlot(db, at("09:20"), at("09:27"), task.id);
    await insertSlot(db, at("09:27"), at("10:16"), null);
    await insertSlot(db, at("13:05"), null, task.id);

    const periods = await getWorkPeriods(
      db,
      { from: at("00:00"), to: at("23:59") },
      at("14:05"),
    );

    expect(periods.map((p) => [p.startedAt, p.endedAt, p.minutes])).toEqual([
      [at("09:20"), at("10:16"), 56],
      [at("13:05"), null, 60],
    ]);
    expect(periods[0]?.projectIds).toEqual([project.id, null]);
  });
});
