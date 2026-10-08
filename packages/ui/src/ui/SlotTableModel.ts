import type { TimeSpan } from "./DayBarsModel";
import { minutesBetween } from "./DayBarsModel";

/** One row of the slot table: a slot, or a gap between two slots. */
export type SlotTableRow<S extends TimeSpan> =
  | { kind: "slot"; slot: S }
  | { kind: "gap"; start: Date; end: Date };

/**
 * The slots sorted by start, with a gap row wherever a finished slot ends
 * at least one whole minute before the next one starts.
 */
export function withGaps<S extends TimeSpan>(
  slots: readonly S[],
): SlotTableRow<S>[] {
  const sorted = [...slots].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const rows: SlotTableRow<S>[] = [];
  let lastEnd: Date | null = null;
  for (const slot of sorted) {
    if (lastEnd && minutesBetween(lastEnd, slot.start) >= 1)
      rows.push({ kind: "gap", start: lastEnd, end: slot.start });
    rows.push({ kind: "slot", slot });
    // A running slot has no end yet, so nothing after it is a gap.
    if (!slot.end) lastEnd = null;
    else if (!lastEnd || slot.end > lastEnd) lastEnd = slot.end;
  }
  return rows;
}

/** A clock time in the edit row, as hours and minutes. */
export interface ClockTime {
  hour: number;
  minute: number;
}

/**
 * The values of the edit row. `end: null` keeps a running slot running.
 * `endNextDay` is true when the end lies on the day after the start.
 */
export interface SlotDraft<K = string | number> {
  start: ClockTime | null;
  end: ClockTime | null;
  endNextDay: boolean;
  taskId: K | null;
}

/** Why a draft cannot be saved. */
export type DraftProblem = "missingTime" | "endNotAfterStart" | "startAfterNow";

const toMinutes = (time: ClockTime) => time.hour * 60 + time.minute;

/** True when the end is before the start: the slot ends on the next day. */
export function endsNextDay(draft: Pick<SlotDraft, "start" | "end">): boolean {
  return (
    !!draft.start &&
    !!draft.end &&
    toMinutes(draft.end) < toMinutes(draft.start)
  );
}

/**
 * The problem that keeps a draft from being saved, or `null` when it can
 * be saved. A running slot needs only a start, and that start must not be
 * after `now`; `startDay` is the day the slot starts on, so a slot that
 * runs since yesterday stays valid after midnight. An end before the
 * start counts as the next day.
 */
export function checkDraft(
  draft: Pick<SlotDraft, "start" | "end">,
  isRunning: boolean,
  now: Date,
  startDay: Date = now,
): DraftProblem | null {
  if (!draft.start || (!isRunning && !draft.end)) return "missingTime";
  if (isRunning) {
    const start = new Date(startDay);
    start.setHours(draft.start.hour, draft.start.minute, 0, 0);
    if (start.getTime() > now.getTime()) return "startAfterNow";
  }
  if (draft.end && toMinutes(draft.end) === toMinutes(draft.start))
    return "endNotAfterStart";
  return null;
}

/**
 * The minutes from start to end of a draft; an end before the start lies
 * on the next day. `null` when a time is missing.
 */
export function draftMinutes(
  draft: Pick<SlotDraft, "start" | "end">,
): number | null {
  if (!draft.start || !draft.end) return null;
  const minutes = toMinutes(draft.end) - toMinutes(draft.start);
  return minutes >= 0 ? minutes : minutes + 24 * 60;
}

/** The clock time of a date. */
export function clockOf(date: Date): ClockTime {
  return { hour: date.getHours(), minute: date.getMinutes() };
}
