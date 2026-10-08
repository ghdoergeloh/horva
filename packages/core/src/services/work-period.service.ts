import type { Database } from "@horva/db/client";

import { listSlots } from "./slot.service";

/** A slot as the merge needs it; `endedAt` is null while it runs. */
export interface WorkSlot {
  startedAt: Date;
  endedAt: Date | null;
  projectId: number | null;
}

/**
 * A stretch of work without a break: slots that follow each other merged
 * into one, for copying into a time-recording system.
 */
export interface WorkPeriod {
  startedAt: Date;
  /** Null while the last slot of the period runs. */
  endedAt: Date | null;
  /** From start to end (or to now while running), whole minutes. */
  minutes: number;
  slotCount: number;
  /** The projects in the order they first appear; null for no project. */
  projectIds: (number | null)[];
}

function sameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Merges slots that touch or overlap into work periods. Slots are stored
 * in whole minutes, so any gap is a break and ends a period; so does
 * midnight: every period belongs to the local day it starts on.
 */
export function mergeWorkPeriods(slots: WorkSlot[], now: Date): WorkPeriod[] {
  const sorted = [...slots].sort(
    (a, b) => a.startedAt.getTime() - b.startedAt.getTime(),
  );
  const periods: WorkPeriod[] = [];
  let open: { period: WorkPeriod; end: Date } | null = null;

  for (const s of sorted) {
    const end = s.endedAt ?? now;
    const joins =
      open !== null &&
      s.startedAt.getTime() <= open.end.getTime() &&
      sameLocalDay(s.startedAt, open.period.startedAt);
    if (open && joins) {
      open.period.slotCount += 1;
      if (!open.period.projectIds.includes(s.projectId))
        open.period.projectIds.push(s.projectId);
      if (end.getTime() >= open.end.getTime()) {
        open.end = end;
        open.period.endedAt = s.endedAt;
      }
    } else {
      open = {
        end,
        period: {
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          minutes: 0,
          slotCount: 1,
          projectIds: [s.projectId],
        },
      };
      periods.push(open.period);
    }
    open.period.minutes = Math.round(
      (open.end.getTime() - open.period.startedAt.getTime()) / 60_000,
    );
  }
  return periods;
}

/** The work periods of the slots that start in the range. */
export async function getWorkPeriods(
  db: Database,
  range: { from: Date; to: Date },
  now: Date = new Date(),
): Promise<WorkPeriod[]> {
  const slots = await listSlots(db, range);
  return mergeWorkPeriods(
    slots.map((s) => ({
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      projectId: s.task?.projectId ?? null,
    })),
    now,
  );
}
