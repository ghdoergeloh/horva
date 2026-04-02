import i18n from "~/i18n/index.js";

export function toDateInputValue(d: Date | string | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

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

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${String(h)}h ${String(m)}m` : `${String(h)}h`;
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
