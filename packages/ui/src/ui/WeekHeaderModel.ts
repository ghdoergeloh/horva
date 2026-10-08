import { startOfDay } from "./DayBarsModel";

/** The date `days` days after `date`, at the same local time. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * The title of a week from its first day in the given locale, such as
 * `5.–11. Oktober 2026`, `28. September – 4. Oktober 2026` or
 * `October 5 – 11, 2026`.
 */
export function formatWeekRange(weekStart: Date, locale = "de-DE"): string {
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).formatRange(weekStart, addDays(weekStart, 6));
}

/** True when the week after the one starting at `weekStart` lies in the future. */
export function isNextWeekInFuture(weekStart: Date, now: Date): boolean {
  return addDays(startOfDay(weekStart), 7).getTime() > now.getTime();
}
