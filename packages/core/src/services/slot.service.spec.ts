import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { db } from "@horva/db/client";

import {
  createProjectFixture,
  createTaskFixture,
  resetDb,
} from "../test-support/db.js";
import {
  assignTaskToSlot,
  deleteSlot,
  doneSlot,
  editSlot,
  getNextSlot,
  getOpenSlot,
  getPrevSlot,
  getSlot,
  insertSlot,
  listSlots,
  splitSlot,
  startSlot,
  stopSlot,
} from "./slot.service.js";

const DAY = new Date("2026-06-01T00:00:00.000Z");
const at = (hour: number, minute = 0) =>
  new Date(DAY.getTime() + (hour * 60 + minute) * 60_000);

beforeEach(async () => {
  await resetDb(db);
});

afterAll(async () => {
  await db.close();
});

async function taskFixture() {
  const project = await createProjectFixture(db);
  return createTaskFixture(db, project.id);
}

describe("startSlot", () => {
  it("creates an active slot when no slot is open", async () => {
    const task = await taskFixture();
    const { closedSlot, newSlot } = await startSlot(db, task.id, at(9));
    expect(closedSlot).toBeNull();
    expect(newSlot).toMatchObject({ taskId: task.id, state: "active" });
  });

  it("creates a no_task slot when started without a task", async () => {
    const { newSlot } = await startSlot(db, undefined, at(9));
    expect(newSlot).toMatchObject({ taskId: null, state: "no_task" });
  });

  it("closes the previously open slot at the new start time", async () => {
    const task = await taskFixture();
    await startSlot(db, task.id, at(9));
    const { closedSlot, newSlot } = await startSlot(db, undefined, at(10));

    expect(closedSlot?.endedAt).toEqual(at(10));
    expect(newSlot.startedAt).toEqual(at(10));
    const open = await getOpenSlot(db);
    expect(open?.id).toBe(newSlot.id);
  });

  it("deletes the previous slot instead of closing it when started at the exact same instant", async () => {
    const task = await taskFixture();
    const { newSlot: first } = await startSlot(db, task.id, at(9));
    await startSlot(db, undefined, at(9));

    const stillThere = await getSlot(db, first.id);
    expect(stillThere).toBeUndefined();
  });
});

describe("stopSlot", () => {
  it("returns nulls when nothing is open", async () => {
    expect(await stopSlot(db, at(9))).toEqual({
      closedSlot: null,
      newSlot: null,
    });
  });

  it("closes the open slot and opens a no_task slot", async () => {
    const task = await taskFixture();
    await startSlot(db, task.id, at(9));
    const { closedSlot, newSlot } = await stopSlot(db, at(10));

    expect(closedSlot?.endedAt).toEqual(at(10));
    expect(newSlot).toMatchObject({ taskId: null, state: "no_task" });
  });
});

describe("doneSlot", () => {
  it("closes the open slot without opening a new one", async () => {
    const task = await taskFixture();
    const { newSlot: opened } = await startSlot(db, task.id, at(9));
    const { closedSlot } = await doneSlot(db, at(10));

    expect(closedSlot?.id).toBe(opened.id);
    expect(closedSlot?.endedAt).toEqual(at(10));
    expect(await getOpenSlot(db)).toBeUndefined();
  });
});

describe("assignTaskToSlot", () => {
  it("assigns a task to an open slot", async () => {
    const task = await taskFixture();
    const { newSlot } = await startSlot(db, undefined, at(9));
    const updated = await assignTaskToSlot(db, newSlot.id, task.id);
    expect(updated).toMatchObject({ taskId: task.id, state: "active" });
  });

  it("throws when the slot is already closed", async () => {
    const task = await taskFixture();
    const { newSlot } = await startSlot(db, task.id, at(9));
    await stopSlot(db, at(10));
    await expect(assignTaskToSlot(db, newSlot.id, task.id)).rejects.toThrow(
      "No open slot found",
    );
  });

  it("throws for a non-existent slot", async () => {
    await expect(assignTaskToSlot(db, 999, 1)).rejects.toThrow(
      "No open slot found",
    );
  });
});

describe("getPrevSlot / getNextSlot", () => {
  it("finds adjacent slots and returns null past the edges", async () => {
    await insertSlot(db, at(9), at(10));
    const middle = (await insertSlot(db, at(10), at(11))).inserted;
    await insertSlot(db, at(11), at(12));

    const prev = await getPrevSlot(db, middle);
    const next = await getNextSlot(db, middle);
    expect(prev?.endedAt).toEqual(at(10));
    expect(next?.startedAt).toEqual(at(11));

    const first = await getSlot(db, 1);
    if (!first) throw new Error("fixture missing");
    expect(await getPrevSlot(db, first)).toBeNull();
  });
});

describe("editSlot", () => {
  it("throws for a non-existent slot", async () => {
    await expect(editSlot(db, 999, {})).rejects.toThrow("not found");
  });

  it("updates state to no_task/active when the task changes", async () => {
    const task = await taskFixture();
    const { inserted } = await insertSlot(db, at(9), at(10), task.id);

    const cleared = await editSlot(db, inserted.id, { taskId: null });
    expect(cleared.updated.state).toBe("no_task");

    const reassigned = await editSlot(db, inserted.id, { taskId: task.id });
    expect(reassigned.updated.state).toBe("active");
  });

  it("pushes the next slot forward when the new end overlaps it", async () => {
    const { inserted: first } = await insertSlot(db, at(9), at(10));
    const { inserted: second } = await insertSlot(db, at(10), at(11));

    const { updated, neighborAdjusted } = await editSlot(db, first.id, {
      endedAt: at(10, 30),
    });

    expect(updated.endedAt).toEqual(at(10, 30));
    expect(neighborAdjusted).toEqual({
      id: second.id,
      field: "startedAt",
      from: at(10),
      to: at(10, 30),
    });
    const reloadedSecond = await getSlot(db, second.id);
    expect(reloadedSecond?.startedAt).toEqual(at(10, 30));
  });

  it("pushes the previous slot's end back when the new start overlaps it", async () => {
    const { inserted: first } = await insertSlot(db, at(9), at(10));
    const { inserted: second } = await insertSlot(db, at(10), at(11));

    const { neighborAdjusted } = await editSlot(db, second.id, {
      startedAt: at(9, 30),
    });

    expect(neighborAdjusted).toEqual({
      id: first.id,
      field: "endedAt",
      from: at(10),
      to: at(9, 30),
    });
    const reloadedFirst = await getSlot(db, first.id);
    expect(reloadedFirst?.endedAt).toEqual(at(9, 30));
  });

  it("restores active/no_task state when reopening a slot", async () => {
    const task = await taskFixture();
    const { inserted } = await insertSlot(db, at(9), at(10), task.id);
    const { updated } = await editSlot(db, inserted.id, { endedAt: null });
    expect(updated.state).toBe("active");
    expect(updated.endedAt).toBeNull();
  });
});

describe("insertSlot", () => {
  it("rejects an end time at or before the start time", async () => {
    await expect(insertSlot(db, at(10), at(10))).rejects.toThrow(
      "endedAt must be after startedAt",
    );
    await expect(insertSlot(db, at(10), at(9))).rejects.toThrow(
      "endedAt must be after startedAt",
    );
  });

  it("inserts into an empty day without adjusting anything", async () => {
    const { inserted, neighborAdjusted } = await insertSlot(db, at(9), at(10));
    expect(inserted.startedAt).toEqual(at(9));
    expect(neighborAdjusted).toBeUndefined();
  });

  it("shortens the previous slot when the new one overlaps its end", async () => {
    const { inserted: prev } = await insertSlot(db, at(8), at(10));
    const { neighborAdjusted } = await insertSlot(db, at(9), at(11));

    expect(neighborAdjusted).toEqual({
      id: prev.id,
      field: "endedAt",
      from: at(10),
      to: at(9),
    });
    expect((await getSlot(db, prev.id))?.endedAt).toEqual(at(9));
  });

  it("pushes the next slot's start when the new one overlaps its start", async () => {
    const { inserted: next } = await insertSlot(db, at(11), at(12));
    const { neighborAdjusted } = await insertSlot(db, at(10), at(11, 30));

    expect(neighborAdjusted).toEqual({
      id: next.id,
      field: "startedAt",
      from: at(11),
      to: at(11, 30),
    });
    expect((await getSlot(db, next.id))?.startedAt).toEqual(at(11, 30));
  });
});

describe("splitSlot", () => {
  it("throws for a non-existent slot", async () => {
    await expect(splitSlot(db, 999, at(10))).rejects.toThrow("not found");
  });

  it("rejects a split time outside the slot's range", async () => {
    const { inserted } = await insertSlot(db, at(9), at(11));
    await expect(splitSlot(db, inserted.id, at(9))).rejects.toThrow(
      "must be after slot start",
    );
    await expect(splitSlot(db, inserted.id, at(11))).rejects.toThrow(
      "must be before slot end",
    );
  });

  it("splits a slot into two adjacent slots", async () => {
    const task = await taskFixture();
    const { inserted } = await insertSlot(db, at(9), at(11), task.id);
    const { first, second } = await splitSlot(db, inserted.id, at(10));

    expect(first.endedAt).toEqual(at(10));
    expect(second).toMatchObject({
      startedAt: at(10),
      endedAt: at(11),
      taskId: task.id,
    });
  });
});

describe("deleteSlot", () => {
  it("throws for a non-existent slot", async () => {
    await expect(deleteSlot(db, 999)).rejects.toThrow("not found");
  });

  it("deletes an existing slot", async () => {
    const { inserted } = await insertSlot(db, at(9), at(10));
    const deleted = await deleteSlot(db, inserted.id);
    expect(deleted.id).toBe(inserted.id);
    expect(await getSlot(db, inserted.id)).toBeUndefined();
  });
});

describe("listSlots", () => {
  it("filters by date range and tasksOnly", async () => {
    const task = await taskFixture();
    await insertSlot(db, at(9), at(10), task.id);
    await insertSlot(db, at(10), at(11));
    await insertSlot(
      db,
      new Date(at(9).getTime() + 24 * 60 * 60_000),
      new Date(at(10).getTime() + 24 * 60 * 60_000),
    );

    const sameDay = await listSlots(db, { from: at(0), to: at(23, 59) });
    expect(sameDay).toHaveLength(2);

    const tasksOnly = await listSlots(db, {
      from: at(0),
      to: at(23, 59),
      tasksOnly: true,
    });
    expect(tasksOnly).toHaveLength(1);
    expect(tasksOnly[0]?.taskId).toBe(task.id);
  });
});
