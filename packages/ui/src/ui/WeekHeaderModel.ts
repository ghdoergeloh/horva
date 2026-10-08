import { startOfDay } from "./DayBarsModel";

/** The date `days` days after `date`, at the same local time. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * The title of a week from its first day, such as `5.–11. Oktober 2026`,
 * `28. September – 4. Oktober 2026` or
 * `28. Dezember 2026 – 3. Januar 2027`.
 */
export function formatWeekRange(weekStart: Date, locale = "de-DE"): string {
  const end = addDays(weekStart, 6);
  const day = (date: Date) => `${String(date.getDate())}.`;
  const month = (date: Date) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(date);
  const year = (date: Date) => String(date.getFullYear());
  if (weekStart.getFullYear() !== end.getFullYear())
    return `${day(weekStart)} ${month(weekStart)} ${year(weekStart)} – ${day(end)} ${month(end)} ${year(end)}`;
  if (weekStart.getMonth() !== end.getMonth())
    return `${day(weekStart)} ${month(weekStart)} – ${day(end)} ${month(end)} ${year(end)}`;
  return `${day(weekStart)}–${day(end)} ${month(end)} ${year(end)}`;
}

/** True when the week after the one starting at `weekStart` lies in the future. */
export function isNextWeekInFuture(weekStart: Date, now: Date): boolean {
  return addDays(startOfDay(weekStart), 7).getTime() > now.getTime();
}
