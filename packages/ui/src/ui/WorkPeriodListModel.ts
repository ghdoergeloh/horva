import type { TimeSpan } from "./DayBarsModel";
import { formatClock, minutesBetween, spanEnd } from "./DayBarsModel";

/** One row of the work period list: a period or the break before the next. */
export type WorkPeriodRow<P extends TimeSpan> =
  | { kind: "period"; period: P }
  | { kind: "break"; start: Date; end: Date };

/**
 * The periods sorted by start, with a break row wherever the next period
 * starts after the latest end so far.
 */
export function withBreaks<P extends TimeSpan>(
  periods: readonly P[],
  now: Date,
): WorkPeriodRow<P>[] {
  const sorted = [...periods].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  );
  const rows: WorkPeriodRow<P>[] = [];
  // The latest end so far: a period inside another one does not end it.
  let lastEnd: Date | null = null;
  for (const period of sorted) {
    if (lastEnd && period.start.getTime() > lastEnd.getTime())
      rows.push({ kind: "break", start: lastEnd, end: period.start });
    rows.push({ kind: "period", period });
    const end = spanEnd(period, now);
    if (!lastEnd || end.getTime() > lastEnd.getTime()) lastEnd = end;
  }
  return rows;
}

/** One period as text to copy, such as `09:20–12:02`. A running one ends now. */
export function periodCopyText(period: TimeSpan, now: Date): string {
  return `${formatClock(period.start)}–${formatClock(spanEnd(period, now))}`;
}

/** All periods of a day as text to copy, such as `09:20–12:02, 13:05–18:12`. */
export function dayCopyText(periods: readonly TimeSpan[], now: Date): string {
  return [...periods]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .map((period) => periodCopyText(period, now))
    .join(", ");
}

/** The working minutes and the break minutes of a day. */
export function sumPeriods(
  periods: readonly TimeSpan[],
  now: Date,
): { work: number; breaks: number } {
  let work = 0;
  let breaks = 0;
  for (const row of withBreaks(periods, now)) {
    if (row.kind === "break") breaks += minutesBetween(row.start, row.end);
    else work += minutesBetween(row.period.start, spanEnd(row.period, now));
  }
  return { work, breaks };
}
