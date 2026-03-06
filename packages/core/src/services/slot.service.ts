import type { Db } from "@repo/db/client";
import { and, asc, between, eq, gte, isNull, lte } from "@repo/db";
import { slot } from "@repo/db/schema";

export function roundToMinute(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  return d;
}

export async function getOpenSlot(db: Db) {
  return db.query.slot.findFirst({
    where: isNull(slot.endedAt),
    with: {
      task: {
        with: {
          project: true,
          taskLabels: { with: { label: true } },
        },
      },
    },
  });
}

export async function startSlot(db: Db, taskId?: number, at?: Date) {
  const now = roundToMinute(at ?? new Date());

  return db.transaction(async (tx) => {
    // Close any open slot
    const openSlot = await tx.query.slot.findFirst({
      where: isNull(slot.endedAt),
    });

    if (openSlot) {
      await tx
        .update(slot)
        .set({ endedAt: now })
        .where(eq(slot.id, openSlot.id));
    }

    const state = taskId ? ("active" as const) : ("no_task" as const);

    const [newSlot] = await tx
      .insert(slot)
      .values({
        startedAt: now,
        taskId: taskId ?? null,
        state,
      })
      .returning();

    if (!newSlot) throw new Error("Failed to create slot");
    return {
      closedSlot: openSlot ? { ...openSlot, endedAt: now } : null,
      newSlot,
    };
  });
}

export async function stopSlot(db: Db, at?: Date) {
  const now = roundToMinute(at ?? new Date());

  return db.transaction(async (tx) => {
    const openSlot = await tx.query.slot.findFirst({
      where: isNull(slot.endedAt),
      with: {
        task: { with: { project: true } },
      },
    });

    if (!openSlot) {
      return { closedSlot: null, newSlot: null };
    }

    await tx.update(slot).set({ endedAt: now }).where(eq(slot.id, openSlot.id));

    const [newSlot] = await tx
      .insert(slot)
      .values({
        startedAt: now,
        taskId: null,
        state: "no_task" as const,
      })
      .returning();

    if (!newSlot) throw new Error("Failed to create slot");
    return {
      closedSlot: { ...openSlot, endedAt: now },
      newSlot,
    };
  });
}

export async function doneSlot(db: Db, at?: Date) {
  const now = roundToMinute(at ?? new Date());

  const openSlot = await db.query.slot.findFirst({
    where: isNull(slot.endedAt),
    with: {
      task: { with: { project: true } },
    },
  });

  if (!openSlot) {
    return { closedSlot: null };
  }

  await db.update(slot).set({ endedAt: now }).where(eq(slot.id, openSlot.id));

  return { closedSlot: { ...openSlot, endedAt: now } };
}

export async function assignTaskToSlot(db: Db, slotId: number, taskId: number) {
  const openSlot = await db.query.slot.findFirst({
    where: eq(slot.id, slotId),
  });
  if (openSlot?.endedAt !== null) {
    throw new Error("No open slot found");
  }
  const [row] = await db
    .update(slot)
    .set({ taskId, state: "active" })
    .where(eq(slot.id, slotId))
    .returning();
  if (!row) throw new Error("Slot not found");
  return row;
}

export async function getSlotStatus(db: Db) {
  return getOpenSlot(db);
}

export async function listSlots(
  db: Db,
  opts: { from: Date; to: Date; projectId?: number; tasksOnly?: boolean },
) {
  return db.query.slot.findMany({
    where: and(
      gte(slot.startedAt, opts.from),
      lte(slot.startedAt, opts.to),
      opts.tasksOnly ? eq(slot.state, "active") : undefined,
    ),
    with: {
      task: {
        with: { project: true },
      },
    },
    orderBy: [asc(slot.startedAt)],
  });
}

export type SlotWithTask = Awaited<ReturnType<typeof listSlots>>[number];

export async function getSlot(db: Db, id: number) {
  return db.query.slot.findFirst({
    where: eq(slot.id, id),
    with: { task: { with: { project: true } } },
  });
}

/** Find the slot immediately before (by endedAt = given slot's startedAt or closest) */
export async function getPrevSlot(db: Db, s: { id: number; startedAt: Date }) {
  // Find the slot whose endedAt equals this slot's startedAt (adjacent)
  const startOfDay = new Date(s.startedAt);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(s.startedAt);
  endOfDay.setHours(23, 59, 59, 999);

  const slots = await db.query.slot.findMany({
    where: and(
      between(slot.startedAt, startOfDay, s.startedAt),
      eq(slot.id, slot.id), // satisfy TS, will filter below
    ),
    orderBy: [asc(slot.startedAt)],
  });
  // Find the one that ends right at or before our start
  return (
    slots.filter((sl) => sl.id !== s.id && sl.endedAt !== null).at(-1) ?? null
  );
}

/** Find the slot immediately after (by startedAt = given slot's endedAt or closest) */
export async function getNextSlot(
  db: Db,
  s: { id: number; startedAt: Date; endedAt?: Date | null },
) {
  const endOfDay = new Date(s.startedAt);
  endOfDay.setHours(23, 59, 59, 999);

  const afterTime = s.endedAt ?? s.startedAt;

  const slots = await db.query.slot.findMany({
    where: and(between(slot.startedAt, afterTime, endOfDay)),
    orderBy: [asc(slot.startedAt)],
  });
  return (
    slots.find((sl) => sl.id !== s.id && sl.startedAt >= afterTime) ?? null
  );
}

export async function editSlot(
  db: Db,
  id: number,
  changes: { startedAt?: Date; endedAt?: Date | null; taskId?: number | null },
): Promise<{
  updated: NonNullable<Awaited<ReturnType<typeof getSlot>>>;
  neighborAdjusted?: {
    id: number;
    field: "startedAt" | "endedAt";
    from: Date;
    to: Date;
  };
}> {
  return db.transaction(async (tx) => {
    const current = await tx.query.slot.findFirst({
      where: eq(slot.id, id),
      with: { task: { with: { project: true } } },
    });
    if (!current) throw new Error(`Slot #${id} not found`);

    const newStart = changes.startedAt ?? current.startedAt;
    const newEnd =
      changes.endedAt !== undefined ? changes.endedAt : current.endedAt;

    let neighborAdjusted:
      | { id: number; field: "startedAt" | "endedAt"; from: Date; to: Date }
      | undefined;

    if (changes.endedAt !== undefined && newEnd !== null) {
      // Check next slot
      const startOfDay = new Date(current.startedAt);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(current.startedAt);
      endOfDay.setHours(23, 59, 59, 999);

      const allSlots = await tx.query.slot.findMany({
        where: and(between(slot.startedAt, startOfDay, endOfDay)),
        orderBy: [asc(slot.startedAt)],
      });
      const nextSlot = allSlots.find(
        (sl) => sl.id !== id && sl.startedAt >= current.startedAt,
      );

      if (nextSlot) {
        await tx
          .update(slot)
          .set({ startedAt: newEnd })
          .where(eq(slot.id, nextSlot.id));
        neighborAdjusted = {
          id: nextSlot.id,
          field: "startedAt",
          from: nextSlot.startedAt,
          to: newEnd,
        };
      }
    }

    if (changes.startedAt !== undefined) {
      // Check prev slot
      const startOfDay = new Date(current.startedAt);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(current.startedAt);
      endOfDay.setHours(23, 59, 59, 999);

      const allSlots = await tx.query.slot.findMany({
        where: and(between(slot.startedAt, startOfDay, endOfDay)),
        orderBy: [asc(slot.startedAt)],
      });
      const prevSlot = [...allSlots]
        .reverse()
        .find((sl) => sl.id !== id && sl.startedAt < current.startedAt);

      if (prevSlot) {
        await tx
          .update(slot)
          .set({ endedAt: newStart })
          .where(eq(slot.id, prevSlot.id));
        neighborAdjusted = {
          id: prevSlot.id,
          field: "endedAt",
          from: prevSlot.endedAt ?? current.startedAt,
          to: newStart,
        };
      }
    }

    const updateData: Partial<typeof current> = {};
    if (changes.startedAt) updateData.startedAt = changes.startedAt;
    if (changes.endedAt !== undefined) updateData.endedAt = changes.endedAt;
    if (changes.taskId !== undefined) {
      updateData.taskId = changes.taskId;
      updateData.state = changes.taskId === null ? "no_task" : "active";
    }
    // Reopening (endedAt → null): restore appropriate state based on current task
    if (changes.endedAt === null && changes.taskId === undefined) {
      const effectiveTaskId = current.taskId;
      updateData.state = effectiveTaskId ? "active" : "no_task";
    }

    const [updated] = await tx
      .update(slot)
      .set(updateData)
      .where(eq(slot.id, id))
      .returning();
    if (!updated) throw new Error("Slot not found");

    const withTask = await tx.query.slot.findFirst({
      where: eq(slot.id, id),
      with: { task: { with: { project: true } } },
    });
    if (!withTask) throw new Error("Slot not found after update");

    return { updated: withTask, neighborAdjusted };
  });
}

export async function deleteSlot(db: Db, id: number) {
  const existing = await db.query.slot.findFirst({ where: eq(slot.id, id) });
  if (!existing) throw new Error(`Slot #${id} not found`);
  await db.delete(slot).where(eq(slot.id, id));
  return existing;
}

export async function splitSlot(db: Db, id: number, at: Date) {
  return db.transaction(async (tx) => {
    const original = await tx.query.slot.findFirst({
      where: eq(slot.id, id),
      with: { task: { with: { project: true } } },
    });
    if (!original) throw new Error(`Slot #${id} not found`);
    if (at <= original.startedAt)
      throw new Error("Split time must be after slot start");
    if (original.endedAt && at >= original.endedAt) {
      throw new Error("Split time must be before slot end");
    }

    // Shorten original to [start, at]
    await tx.update(slot).set({ endedAt: at }).where(eq(slot.id, id));

    // Create new slot [at, originalEnd]
    const [second] = await tx
      .insert(slot)
      .values({
        startedAt: at,
        endedAt: original.endedAt,
        taskId: original.taskId,
        state: original.state,
      })
      .returning();
    if (!second) throw new Error("Failed to create split slot");

    return { first: { ...original, endedAt: at }, second };
  });
}
