import { RRule } from "rrule";
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
import { label, taskLabel } from "@horva/db/schema";

import {
  createProjectFixture,
  createTaskFixture,
  resetDb,
} from "../test-support/db.js";
import { getOpenSlot, startSlot } from "./slot.service.js";
import {
  archiveTask,
  createTask,
  deleteTask,
  getTask,
  markTaskDone,
  planTask,
  reopenTask,
  reorderTasks,
  updateTask,
} from "./task.service.js";

beforeEach(async () => {
  await resetDb(db);
});

afterEach(() => {
  vi.useRealTimers();
});

afterAll(async () => {
  await db.close();
});

describe("createTask", () => {
  it("uses the given project", async () => {
    const proj = await createProjectFixture(db);
    const created = await createTask(db, {
      name: "Write tests",
      projectId: proj.id,
    });
    expect(created).toMatchObject({ name: "Write tests", projectId: proj.id });
  });

  it("falls back to the default project when none is given", async () => {
    await createProjectFixture(db, { name: "Not default" });
    const def = await createProjectFixture(db, {
      name: "Default",
      isDefault: true,
    });
    const created = await createTask(db, { name: "Inbox task" });
    expect(created.projectId).toBe(def.id);
  });

  it("throws when no project is given and no default exists", async () => {
    await expect(createTask(db, { name: "Orphan" })).rejects.toThrow(
      "Default project not found",
    );
  });

  it("attaches labels", async () => {
    const proj = await createProjectFixture(db);
    const [l1] = await db.insert(label).values({ name: "urgent" }).returning();
    if (!l1) throw new Error("fixture missing");
    const created = await createTask(db, {
      name: "Labeled",
      projectId: proj.id,
      labelIds: [l1.id],
    });
    const links = await db.query.taskLabel.findMany({
      where: (tl, { eq }) => eq(tl.taskId, created.id),
    });
    expect(links).toHaveLength(1);
  });
});

describe("updateTask", () => {
  it("throws for a non-existent task", async () => {
    await expect(updateTask(db, 999, {})).rejects.toThrow("not found");
  });

  it("reopens a done task when converted to an activity", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id, { status: "done" });
    const updated = await updateTask(db, task.id, { taskType: "activity" });
    expect(updated).toMatchObject({ taskType: "activity", status: "open" });
  });

  it("resets status to open when converted from activity to task", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id, {
      taskType: "activity",
      status: "done",
    });
    const updated = await updateTask(db, task.id, { taskType: "task" });
    expect(updated.status).toBe("open");
  });

  it("adds and removes links", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    const withLink = await updateTask(db, task.id, {
      addLinks: ["https://a", "https://b"],
    });
    expect(withLink.links).toEqual(["https://a", "https://b"]);

    const withoutA = await updateTask(db, task.id, {
      removeLinks: ["https://a"],
    });
    expect(withoutA.links).toEqual(["https://b"]);
  });

  it("adds labels without duplicating existing ones", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    const [l1] = await db.insert(label).values({ name: "a" }).returning();
    if (!l1) throw new Error("fixture missing");

    await updateTask(db, task.id, { addLabelIds: [l1.id] });
    await updateTask(db, task.id, { addLabelIds: [l1.id] });

    const links = await db.query.taskLabel.findMany({
      where: (tl, { eq }) => eq(tl.taskId, task.id),
    });
    expect(links).toHaveLength(1);
  });

  it("removes labels", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    const [l1] = await db.insert(label).values({ name: "a" }).returning();
    if (!l1) throw new Error("fixture missing");
    await db.insert(taskLabel).values({ taskId: task.id, labelId: l1.id });

    await updateTask(db, task.id, { removeLabelIds: [l1.id] });
    const links = await db.query.taskLabel.findMany({
      where: (tl, { eq }) => eq(tl.taskId, task.id),
    });
    expect(links).toHaveLength(0);
  });
});

describe("markTaskDone", () => {
  it("throws for a non-existent task", async () => {
    await expect(markTaskDone(db, 999)).rejects.toThrow("not found");
  });

  it("marks a plain task done", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    const done = await markTaskDone(db, task.id);
    expect(done.status).toBe("done");
    expect(done.doneAt).not.toBeNull();
  });

  it("advances a recurring activity to its next occurrence", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00.000Z"));

    const rule = new RRule({
      freq: RRule.DAILY,
      dtstart: new Date("2026-01-01T09:00:00.000Z"),
    });
    const proj = await createProjectFixture(db);
    const activity = await createTaskFixture(db, proj.id, {
      taskType: "activity",
      recurrenceRule: rule.toString(),
    });

    const updated = await markTaskDone(db, activity.id);
    expect(updated.scheduledAt).toEqual(new Date("2026-06-16T09:00:00.000Z"));
    expect(updated.status).toBe("open");
  });

  it("clears scheduledAt for a non-recurring activity", async () => {
    const proj = await createProjectFixture(db);
    const activity = await createTaskFixture(db, proj.id, {
      taskType: "activity",
    });
    const updated = await markTaskDone(db, activity.id);
    expect(updated.scheduledAt).toBeNull();
  });

  it("stops the task's open slot first", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    await startSlot(db, task.id);

    await markTaskDone(db, task.id);

    const open = await getOpenSlot(db);
    expect(open?.taskId).toBeNull();
  });
});

describe("reopenTask / archiveTask", () => {
  it("reopens a done task", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id, { status: "done" });
    const reopened = await reopenTask(db, task.id);
    expect(reopened).toMatchObject({ status: "open", doneAt: null });
  });

  it("archives a task", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    const archived = await archiveTask(db, task.id);
    expect(archived.status).toBe("archived");
    expect(archived.archivedAt).not.toBeNull();
  });
});

describe("deleteTask", () => {
  it("marks open slots task_deleted and closes them", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    await startSlot(db, task.id);

    const { task: deleted, affectedSlots } = await deleteTask(db, task.id);
    expect(deleted.status).toBe("deleted");
    expect(affectedSlots).toBe(1);

    const open = await getOpenSlot(db);
    expect(open).toBeUndefined();
  });
});

describe("reorderTasks", () => {
  it("assigns sequential priorities in the given order", async () => {
    const proj = await createProjectFixture(db);
    const a = await createTaskFixture(db, proj.id, { name: "A" });
    const b = await createTaskFixture(db, proj.id, { name: "B" });

    await reorderTasks(db, [b.id, a.id]);

    expect((await getTask(db, b.id))?.priority).toBe(1);
    expect((await getTask(db, a.id))?.priority).toBe(2);
  });
});

describe("planTask", () => {
  it("sets and clears scheduledAt", async () => {
    const proj = await createProjectFixture(db);
    const task = await createTaskFixture(db, proj.id);
    const date = new Date("2026-07-01T09:00:00.000Z");

    const planned = await planTask(db, task.id, date);
    expect(planned.scheduledAt).toEqual(date);

    const cleared = await planTask(db, task.id, null);
    expect(cleared.scheduledAt).toBeNull();
  });
});
