/** True if Intl accepts the zone, for example "Europe/Berlin" or "UTC". */
export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone }).format(0);
    return true;
  } catch {
    return false;
  }
}

/**
 * Some runtimes, for example some headless browsers, report a time zone that
 * Intl itself does not accept ("Etc/Unknown"). Code that reads the zone from
 * resolvedOptions() and passes it back to Intl then throws. This happens in
 * @internationalized/date and in the React Aria calendars.
 *
 * Only in such a runtime, resolvedOptions() reports "UTC" instead. With a
 * valid zone, nothing changes.
 */
export function ensureValidLocalTimeZone(): void {
  const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (isValidTimeZone(zone)) return;

  // oxlint-disable-next-line typescript/unbound-method
  const original = Intl.DateTimeFormat.prototype.resolvedOptions;
  Intl.DateTimeFormat.prototype.resolvedOptions = function resolvedOptions(
    this: Intl.DateTimeFormat,
  ) {
    const options = original.call(this);
    return isValidTimeZone(options.timeZone)
      ? options
      : { ...options, timeZone: "UTC" };
  };
}
