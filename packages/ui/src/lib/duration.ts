/**
 * Formatting of times for the Horva components, such as the timer, the task
 * card and the report charts. Durations come in whole minutes, the running
 * timer in seconds.
 */

/** Formats a duration in a component; the app can pass its own setting. */
export type FormatDuration = (minutes: number) => string;

/** Minutes as hours and minutes, `445` → `7:25`. Negative values get `−`. */
export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  const sign = rounded < 0 ? "−" : "";
  const abs = Math.abs(rounded);
  const hours = Math.floor(abs / 60);
  const rest = abs % 60;
  return `${sign}${String(hours)}:${String(rest).padStart(2, "0")}`;
}

/** A difference with its sign, `−508` → `−8:28`, `65` → `+1:05`. */
export function formatSignedDuration(
  minutes: number,
  format: FormatDuration = formatDuration,
): string {
  const rounded = Math.round(minutes);
  if (rounded === 0) return format(0);
  return rounded > 0 ? `+${format(rounded)}` : `−${format(-rounded)}`;
}

/** The running timer, `6127` seconds → `01:42:07`. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return [hours, minutes, rest]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

/** A whole percentage with a narrow no-break space, `31` → `31 %`. */
export function formatPercent(percent: number): string {
  return `${String(Math.round(percent))}\u202F%`;
}
