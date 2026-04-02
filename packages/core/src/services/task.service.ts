import type { Db } from "@repo/db/client";
import { and, eq, inArray, isNull, ne, notInArray } from "@repo/db";
import { slot, task, taskLabel } from "@repo/db/schema";

import type { CreateTask, UpdateTask } from "../schemas/index";
import { rruleFromString } from "../utils/rrule";
import { getDefaultProject } from "./project.service";
import { stopSlot } from "./slot.service";

export interface ListTasksOpts {
  projectId?: number;
  status?: "open" | "done" | "archived" | "deleted";
  includeStatuses?: ("open" | "done" | "archived" | "deleted")[];
  taskType?: "task" | "activity";
  limit?: number;
  offset?: number;
}

export async function listTasks(db: Db, opts: ListTasksOpts = {}) {
  const conditions = [];

  if (opts.projectId !== undefined) {
    conditions.push(eq(task.projectId, opts.projectId));
  }

  if (opts.status) {
    conditions.push(eq(task.status, opts.status));
  } else if (opts.includeStatuses) {
    conditions.push(inArray(task.status, opts.includeStatuses));
  } else {
    conditions.push(ne(task.status, "deleted"));
  }

  if (opts.taskType !== undefined) {
    conditions.push(eq(task.taskType, opts.taskType));
  }

  const rows = await db.query.task.findMany({
    where: conditions.length > 0 ? and(...conditions) : undefined,
    with: {
      project: true,
      taskLabels: { with: { label: true } },
      slots: true,
    },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
    limit: opts.limit,
    offset: opts.offset,
  });
  return rows;
}

export async function getTask(db: Db, id: number) {
  return db.query.task.findFirst({
    where: eq(task.id, id),
    with: {
      project: true,
      taskLabels: { with: { label: true } },
      slots: true,
    },
  });
}

export async function createTask(db: Db, input: CreateTask) {
  return db.transaction(async (tx) => {
    let projectId = input.projectId;
    if (!projectId) {
      const defaultProject = await getDefaultProject(db);
      if (!defaultProject) throw new Error("Default project not found");
      projectId = defaultProject.id;
    }

    const [row] = await tx
      .insert(task)
      .values({
        name: input.name,
        projectId,
        taskType: input.taskType ?? "task",
        scheduledAt: input.scheduledAt ?? null,
        recurrenceRule: input.recurrenceRule ?? null,
        notes: input.notes ?? null,
        links: input.links ?? [],
      })
      .returning();

    if (!row) throw new Error("Failed to create task");

    if (input.labelIds && input.labelIds.length > 0) {
      await tx.insert(taskLabel).values(
        input.labelIds.map((labelId) => ({
          taskId: row.id,
          labelId,
        })),
      );
    }

    return row;
  });
}

export async function updateTask(db: Db, id: number, input: UpdateTask) {
  const existing = await getTask(db, id);
  if (!existing) throw new Error(`Task #${id} not found`);

  return db.transaction(async (tx) => {
    const updates: Partial<typeof task.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (input.name !== undefined) updates.name = input.name;
    if (input.projectId !== undefined) updates.projectId = input.projectId;
    if (input.taskType !== undefined) {
      updates.taskType = input.taskType;
      // Converting to activity: reset done status to open (keep scheduledAt)
      if (input.taskType === "activity") {
        if (existing.status === "done") {
          updates.status = "open";
          updates.doneAt = null;
        }
      }
      // Converting from activity to task: reset status to open if needed
      if (input.taskType === "task" && existing.taskType === "activity") {
        updates.status = "open";
      }
    }
    if (input.scheduledAt !== undefined)
      updates.scheduledAt = input.scheduledAt;
    if (input.recurrenceRule !== undefined)
      updates.recurrenceRule = input.recurrenceRule;
    if (input.notes !== undefined) updates.notes = input.notes;

    if (input.addLinks !== undefined || input.removeLinks !== undefined) {
      let links = [...existing.links];
      if (input.addLinks) links = [...links, ...input.addLinks];
      if (input.removeLinks)
        links = links.filter((l) => !input.removeLinks?.includes(l));
      updates.links = links;
    }

    const [row] = await tx
      .update(task)
      .set(updates)
      .where(eq(task.id, id))
      .returning();

    if (input.addLabelIds && input.addLabelIds.length > 0) {
      const existingLabels = await tx
        .select()
        .from(taskLabel)
        .where(
          and(
            eq(taskLabel.taskId, id),
            inArray(taskLabel.labelId, input.addLabelIds),
          ),
        );
      const existingIds = new Set(existingLabels.map((l) => l.labelId));
      const toAdd = input.addLabelIds.filter((lid) => !existingIds.has(lid));
      if (toAdd.length > 0) {
        await tx
          .insert(taskLabel)
          .values(toAdd.map((labelId) => ({ taskId: id, labelId })));
      }
    }

    if (input.removeLabelIds && input.removeLabelIds.length > 0) {
      await tx
        .delete(taskLabel)
        .where(
          and(
            eq(taskLabel.taskId, id),
            inArray(taskLabel.labelId, input.removeLabelIds),
          ),
        );
    }

    if (!row) throw new Error(`Task #${id} not found after update`);
    return row;
  });
}

export async function markTaskDone(db: Db, id: number) {
  const existing = await getTask(db, id);
  if (!existing) throw new Error(`Task #${id} not found`);

  // If this task is currently running, pause it and start a new empty slot
  const openSlot = await db.query.slot.findFirst({
    where: and(eq(slot.taskId, id), isNull(slot.endedAt)),
  });
  if (openSlot) {
    await stopSlot(db);
  }

  const updates: Partial<typeof task.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (existing.taskType === "activity") {
    if (existing.recurrenceRule) {
      // Advance to the next occurrence from now (skips any missed ones)
      const rule = rruleFromString(existing.recurrenceRule);
      const next = rule.after(new Date(), false);
      updates.scheduledAt = next ?? null;
    } else {
      // No recurrence: clear the date so the activity leaves the day plan
      updates.scheduledAt = null;
    }
  } else {
    updates.status = "done";
    updates.doneAt = new Date();
  }

  const [row] = await db
    .update(task)
    .set(updates)
    .where(eq(task.id, id))
    .returning();
  if (!row) throw new Error(`Task #${id} not found after marking done`);
  return row;
}

export async function reopenTask(db: Db, id: number) {
  const existing = await getTask(db, id);
  if (!existing) throw new Error(`Task #${id} not found`);
  const [row] = await db
    .update(task)
    .set({ status: "open", doneAt: null, updatedAt: new Date() })
    .where(eq(task.id, id))
    .returning();
  if (!row) throw new Error(`Task #${id} not found after reopen`);
  return row;
}

export async function archiveTask(db: Db, id: number) {
  const existing = await getTask(db, id);
  if (!existing) throw new Error(`Task #${id} not found`);
  const [row] = await db
    .update(task)
    .set({ status: "archived", archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(task.id, id))
    .returning();
  if (!row) throw new Error(`Task #${id} not found after archive`);
  return row;
}

export async function deleteTask(db: Db, id: number) {
  const existing = await getTask(db, id);
  if (!existing) throw new Error(`Task #${id} not found`);

  return db.transaction(async (tx) => {
    const affectedSlots = await tx
      .select({ id: slot.id })
      .from(slot)
      .where(eq(slot.taskId, id));

    const openSlots = await tx
      .select({ id: slot.id })
      .from(slot)
      .where(and(eq(slot.taskId, id), eq(slot.state, "active")));

    if (openSlots.length > 0) {
      await tx
        .update(slot)
        .set({ state: "task_deleted", endedAt: new Date() })
        .where(
          and(
            eq(slot.taskId, id),
            inArray(
              slot.id,
              openSlots.map((s) => s.id),
            ),
          ),
        );
    }

    const nonOpenIds = affectedSlots
      .map((s) => s.id)
      .filter((sid) => !openSlots.some((os) => os.id === sid));

    if (nonOpenIds.length > 0) {
      await tx
        .update(slot)
        .set({ state: "task_deleted" })
        .where(and(eq(slot.taskId, id), notInArray(slot.id, nonOpenIds)));
    }

    const [row] = await tx
      .update(task)
      .set({ status: "deleted", deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(task.id, id))
      .returning();

    if (!row) throw new Error(`Task #${id} not found after delete`);
    return { task: row, affectedSlots: affectedSlots.length };
  });
}

export async function planTask(db: Db, id: number, date: Date | null) {
  const existing = await getTask(db, id);
  if (!existing) throw new Error(`Task #${id} not found`);
  const [row] = await db
    .update(task)
    .set({ scheduledAt: date, updatedAt: new Date() })
    .where(eq(task.id, id))
    .returning();
  if (!row) throw new Error(`Task #${id} not found after plan`);
  return row;
}
