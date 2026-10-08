import i18n from "#/i18n/index.js";
import { startOfDay } from "#/lib/dateUtils.js";

export function formatScheduledDate(d: Date | string): string {
  const date = new Date(d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const timePart = hasTime
    ? ` ${date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}`
    : "";

  if (dateOnly.getTime() === today.getTime())
    return `${i18n.t("taskUtils.today")}${timePart}`;
  if (dateOnly.getTime() === tomorrow.getTime())
    return `${i18n.t("taskUtils.tomorrow")}${timePart}`;
  return (
    dateOnly.toLocaleDateString(locale, { day: "numeric", month: "short" }) +
    timePart
  );
}

export function calcTotalMinutes(
  slots: { startedAt: Date | string; endedAt: Date | string | null }[],
): number {
  return slots.reduce((sum, s) => {
    if (!s.endedAt) return sum;
    return (
      sum +
      Math.round(
        (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) /
          60000,
      )
    );
  }, 0);
}

/**
 * The day `day` at the time of day of `planned`, so that moving a task to
 * another day keeps its time. Midnight when it has no date yet.
 */
export function onDayKeepingTime(
  day: { year: number; month: number; day: number },
  planned: Date | null,
): Date {
  return new Date(
    day.year,
    day.month - 1,
    day.day,
    planned?.getHours() ?? 0,
    planned?.getMinutes() ?? 0,
  );
}

/** Whether a date is today or on a day before today. */
export function scheduleState(
  planned: Date | null,
  now: Date = new Date(),
): { isPlannedToday: boolean; isOverdue: boolean } {
  if (!planned) return { isPlannedToday: false, isOverdue: false };
  const day = startOfDay(planned).getTime();
  const today = startOfDay(now).getTime();
  return { isPlannedToday: day === today, isOverdue: day < today };
}

/** The label ids to add and to remove to get from `assigned` to `next`. */
export function labelChanges(
  assigned: ReadonlySet<number>,
  next: ReadonlySet<number>,
): { addLabelIds: number[]; removeLabelIds: number[] } {
  return {
    addLabelIds: [...next].filter((id) => !assigned.has(id)),
    removeLabelIds: [...assigned].filter((id) => !next.has(id)),
  };
}
