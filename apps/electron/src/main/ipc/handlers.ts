import type { IpcMain, WebContents } from "electron";

import type {
  CreateProject,
  CreateTask,
  Period,
  UpdateProject,
  UpdateTask,
} from "@horva/core";
import type { Db } from "@horva/db/client";
import {
  archiveProject,
  archiveTask,
  assignTaskToSlot,
  createLabel,
  createProject,
  createTask,
  deleteLabel,
  deleteProject,
  deleteSlot,
  deleteTask,
  doneSlot,
  editSlot,
  getLog,
  getOpenSlot,
  getProject,
  getSummary,
  getTask,
  insertSlot,
  listLabels,
  listProjects,
  listSlots,
  listTasks,
  markTaskDone,
  planTask,
  reopenTask,
  reorderTasks,
  splitSlot,
  startSlot,
  stopSlot,
  updateProject,
  updateTask,
} from "@horva/core";

export type DbChangedScope = "slots" | "tasks" | "all";

/**
 * Parse a date string from the renderer. Throws if the string produces
 * an invalid Date, which would silently cause DB errors downstream.
 */
function parseDate(value: string, field = "date"): Date {
  const d = new Date(value);
  if (isNaN(d.getTime())) throw new Error(`Invalid ${field}: "${value}"`);
  return d;
}

/**
 * Assert a value is a positive integer (valid DB ID).
 */
function assertId(value: unknown, field = "id"): asserts value is number {
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Invalid ${field}: expected positive integer, got ${String(value)}`,
    );
  }
}

// Notify the renderer that the DB has changed so it can refetch immediately.
function notify(sender: WebContents, scope: DbChangedScope): void {
  if (!sender.isDestroyed()) sender.send("db:changed", scope);
}

export function registerHandlers(ipcMain: IpcMain, db: Db): void {
  // Slots
  ipcMain.handle("slots:getOpen", () => getOpenSlot(db));
  ipcMain.handle(
    "slots:start",
    async (_e, taskId: number | undefined, at: string | undefined) => {
      const result = await startSlot(
        db,
        taskId,
        at ? parseDate(at, "at") : undefined,
      );
      notify(_e.sender, "slots");
      return result;
    },
  );
  ipcMain.handle("slots:stop", async (_e, at: string | undefined) => {
    const result = await stopSlot(db, at ? parseDate(at, "at") : undefined);
    notify(_e.sender, "slots");
    return result;
  });
  ipcMain.handle("slots:done", async (_e, at: string | undefined) => {
    const result = await doneSlot(db, at ? parseDate(at, "at") : undefined);
    notify(_e.sender, "slots");
    return result;
  });
  ipcMain.handle("slots:assign", async (_e, slotId: number, taskId: number) => {
    assertId(slotId, "slotId");
    assertId(taskId, "taskId");
    const result = await assignTaskToSlot(db, slotId, taskId);
    notify(_e.sender, "slots");
    return result;
  });
  ipcMain.handle(
    "slots:list",
    (_e, from: string, to: string, projectId: number | undefined) =>
      listSlots(db, {
        from: parseDate(from, "from"),
        to: parseDate(to, "to"),
        projectId,
      }),
  );
  ipcMain.handle(
    "slots:edit",
    async (
      _e,
      id: number,
      changes: {
        startedAt?: string;
        endedAt?: string | null;
        taskId?: number | null;
      },
    ) => {
      assertId(id, "id");
      const result = await editSlot(db, id, {
        startedAt: changes.startedAt
          ? parseDate(changes.startedAt, "startedAt")
          : undefined,
        endedAt:
          changes.endedAt === undefined
            ? undefined
            : changes.endedAt === null
              ? null
              : parseDate(changes.endedAt, "endedAt"),
        taskId: changes.taskId,
      });
      notify(_e.sender, "slots");
      return result;
    },
  );
  ipcMain.handle("slots:delete", async (_e, id: number) => {
    assertId(id, "id");
    const result = await deleteSlot(db, id);
    notify(_e.sender, "slots");
    return result;
  });
  ipcMain.handle("slots:split", async (_e, id: number, at: string) => {
    assertId(id, "id");
    const result = await splitSlot(db, id, parseDate(at, "at"));
    notify(_e.sender, "slots");
    return result;
  });
  ipcMain.handle(
    "slots:insert",
    async (
      _e,
      startedAt: string,
      endedAt: string | null | undefined,
      taskId?: number | null,
    ) => {
      const result = await insertSlot(
        db,
        parseDate(startedAt, "startedAt"),
        endedAt ? parseDate(endedAt, "endedAt") : null,
        taskId,
      );
      notify(_e.sender, "slots");
      return result;
    },
  );

  // Tasks
  ipcMain.handle("tasks:list", (_e, opts: Parameters<typeof listTasks>[1]) =>
    listTasks(db, opts),
  );
  ipcMain.handle("tasks:get", (_e, id: number) => {
    assertId(id, "id");
    return getTask(db, id);
  });
  ipcMain.handle("tasks:create", async (_e, input: CreateTask) => {
    const result = await createTask(db, input);
    notify(_e.sender, "tasks");
    return result;
  });
  ipcMain.handle("tasks:update", async (_e, id: number, input: UpdateTask) => {
    const result = await updateTask(db, id, input);
    notify(_e.sender, "tasks");
    return result;
  });
  ipcMain.handle("tasks:markDone", async (_e, id: number) => {
    assertId(id, "id");
    const result = await markTaskDone(db, id);
    notify(_e.sender, "all");
    return result;
  });
  ipcMain.handle("tasks:reopen", async (_e, id: number) => {
    assertId(id, "id");
    const result = await reopenTask(db, id);
    notify(_e.sender, "tasks");
    return result;
  });
  ipcMain.handle("tasks:archive", async (_e, id: number) => {
    assertId(id, "id");
    const result = await archiveTask(db, id);
    notify(_e.sender, "tasks");
    return result;
  });
  ipcMain.handle("tasks:delete", async (_e, id: number) => {
    assertId(id, "id");
    const result = await deleteTask(db, id);
    notify(_e.sender, "tasks");
    return result;
  });
  ipcMain.handle("tasks:reorder", async (_e, orderedIds: number[]) => {
    if (!Array.isArray(orderedIds)) throw new Error("orderedIds must be array");
    for (const id of orderedIds) assertId(id, "id");
    await reorderTasks(db, orderedIds);
    notify(_e.sender, "tasks");
  });
  ipcMain.handle("tasks:plan", async (_e, id: number, date: string | null) => {
    assertId(id, "id");
    const result = await planTask(
      db,
      id,
      date ? parseDate(date, "date") : null,
    );
    notify(_e.sender, "tasks");
    return result;
  });
  ipcMain.handle(
    "tasks:setRecurrence",
    async (_e, id: number, rule: string | null) => {
      assertId(id, "id");
      const result = await updateTask(db, id, { recurrenceRule: rule });
      notify(_e.sender, "tasks");
      return result;
    },
  );

  // Projects
  ipcMain.handle("projects:list", (_e, includeArchived: boolean) =>
    listProjects(db, includeArchived),
  );
  ipcMain.handle("projects:get", (_e, id: number) => {
    assertId(id, "id");
    return getProject(db, id);
  });
  ipcMain.handle("projects:create", async (_e, input: CreateProject) => {
    const result = await createProject(db, input);
    notify(_e.sender, "all");
    return result;
  });
  ipcMain.handle(
    "projects:update",
    async (_e, id: number, input: UpdateProject) => {
      assertId(id, "id");
      const result = await updateProject(db, id, input);
      notify(_e.sender, "all");
      return result;
    },
  );
  ipcMain.handle("projects:archive", async (_e, id: number) => {
    assertId(id, "id");
    const result = await archiveProject(db, id);
    notify(_e.sender, "all");
    return result;
  });
  ipcMain.handle("projects:delete", async (_e, id: number) => {
    assertId(id, "id");
    const result = await deleteProject(db, id);
    notify(_e.sender, "all");
    return result;
  });

  // Labels
  ipcMain.handle("labels:list", () => listLabels(db));
  ipcMain.handle("labels:create", async (_e, name: string) => {
    const result = await createLabel(db, name);
    notify(_e.sender, "all");
    return result;
  });
  ipcMain.handle("labels:delete", async (_e, id: number) => {
    assertId(id, "id");
    const result = await deleteLabel(db, id);
    notify(_e.sender, "all");
    return result;
  });

  // Log / Summary
  ipcMain.handle("log:get", (_e, period: Period) => getLog(db, period));
  ipcMain.handle("log:getSummary", (_e, period: Period) =>
    getSummary(db, period),
  );
  ipcMain.handle("log:getRange", (_e, from: string, to: string) =>
    getLog(db, { from: parseDate(from, "from"), to: parseDate(to, "to") }),
  );
  ipcMain.handle("log:getSummaryRange", (_e, from: string, to: string) =>
    getSummary(db, { from: parseDate(from, "from"), to: parseDate(to, "to") }),
  );
}
