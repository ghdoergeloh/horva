/** A time span on the timeline. `end: null` means it is still running. */
export interface TimeSpan {
  start: Date;
  end: Date | null;
}

/** The hours the scale shows, as whole hours from 0 to 24. */
export interface HourRange {
  startHour: number;
  endHour: number;
}

/** The range without any span: a normal working day. */
export const defaultHourRange: HourRange = { startHour: 8, endHour: 18 };

const MINUTE = 60_000;
const DAY_MINUTES = 24 * 60;

/** Midnight at the start of the day of `date`, in local time. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** True when both dates fall on the same local day. */
export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

/** The end of a span; a running span ends `now`. */
export function spanEnd(span: TimeSpan, now: Date): Date {
  return span.end ?? now;
}

/**
 * The part of a span that lies on `day`, as minutes since midnight. A span
 * across midnight is cut at the day border. `null` when nothing of the span
 * lies on the day.
 */
export function minutesOnDay(
  span: TimeSpan,
  day: Date,
  now: Date,
): { start: number; end: number } | null {
  const dayStart = startOfDay(day).getTime();
  const toMinutes = (date: Date) =>
    Math.min(DAY_MINUTES, Math.max(0, (date.getTime() - dayStart) / MINUTE));
  const start = toMinutes(span.start);
  const end = toMinutes(spanEnd(span, now));
  if (end <= start) return null;
  return { start, end };
}

/**
 * The hour range for a week of days: from the earliest start to the
 * latest end, rounded out to whole hours. A running span counts up to
 * `now`, so its bar always fits. Spans are cut at the border of their day.
 * Without spans the range is `fallback`.
 */
export function getHourRange(
  days: readonly { date: Date; spans: readonly TimeSpan[] }[],
  now: Date,
  fallback: HourRange = defaultHourRange,
): HourRange {
  let min = Infinity;
  let max = -Infinity;
  for (const day of days) {
    for (const span of day.spans) {
      const minutes = minutesOnDay(span, day.date, now);
      if (!minutes) continue;
      min = Math.min(min, minutes.start);
      max = Math.max(max, minutes.end);
    }
  }
  if (min === Infinity) return fallback;
  // Each span has a positive length inside the day, so the end hour is
  // always after the start hour.
  return {
    startHour: Math.floor(min / 60),
    endHour: Math.ceil(max / 60),
  };
}

/**
 * Left edge and width of a span inside the range, in percent. Both are
 * clamped, so a bar never leaves the track.
 */
export function placeSpan(
  minutes: { start: number; end: number },
  range: HourRange,
): { left: number; width: number } {
  const from = range.startHour * 60;
  const length = (range.endHour - range.startHour) * 60;
  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const left = clamp(((minutes.start - from) / length) * 100);
  const right = clamp(((minutes.end - from) / length) * 100);
  return { left, width: right - left };
}

/** The minutes of all spans on `day`, a running span up to `now`. */
export function totalMinutesOnDay(
  spans: readonly TimeSpan[],
  day: Date,
  now: Date,
): number {
  let total = 0;
  for (const span of spans) {
    const minutes = minutesOnDay(span, day, now);
    if (minutes) total += minutes.end - minutes.start;
  }
  return total;
}

/** Whole minutes between two dates, never below zero. */
export function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((end.getTime() - start.getTime()) / MINUTE));
}

/** A clock time as `09:05`. */
export function formatClock(date: Date): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/** An hour of the scale as `09:00`. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** A duration as `h:mm`, such as `7:43` or `0:07`. */
export function formatDuration(minutes: number): string {
  const whole = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(whole / 60);
  return `${String(hours)}:${String(whole % 60).padStart(2, "0")}`;
}
