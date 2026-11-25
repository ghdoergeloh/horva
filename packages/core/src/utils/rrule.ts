import * as rruleModule from "rrule";

// rrule ships a CommonJS and an ESM build. Node.js loads the CommonJS build
// and puts its exports under `default`. Bundlers that pick the ESM build
// provide named exports only.
type RRuleModule = typeof rruleModule;
const loaded = rruleModule as RRuleModule & { default?: RRuleModule };
const { RRule } = loaded.default ?? loaded;

// rrule.js converts occurrences of a rule with TZID through the time zone of
// the running process, so the same rule gives different instants on a server
// in UTC and on a desktop in Europe/Berlin. To stay independent of that, the
// rule is evaluated without TZID on "floating" dates (UTC fields hold the
// wall-clock time in the rule's zone), and only the result is converted to a
// real instant with the Intl API.

const DTSTART_WITH_TZID =
  /DTSTART;TZID=([^:\n]+):(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/;

/** Wall-clock time of `instant` in `tzid`, stored in the UTC fields of a Date. */
function toFloating(instant: Date, tzid: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tzid,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return new Date(
    Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      get("hour"),
      get("minute"),
      get("second"),
      instant.getUTCMilliseconds(),
    ),
  );
}

/** Instant at which the wall clock in `tzid` shows the floating date. */
function fromFloating(floating: Date, tzid: string): Date {
  const offsetAt = (instant: Date) =>
    toFloating(instant, tzid).getTime() - instant.getTime();
  // The offset at the guessed instant can differ near a daylight saving
  // change, so correct the guess once with the offset found there.
  const guess = new Date(floating.getTime() - offsetAt(floating));
  return new Date(floating.getTime() - offsetAt(guess));
}

/**
 * Next occurrence of an RFC 5545 rule strictly after `after`, or null when the
 * rule has none. A DTSTART with TZID keeps its wall-clock time in that zone,
 * across daylight saving changes and whatever the time zone of the process.
 */
export function nextOccurrence(ruleString: string, after: Date): Date | null {
  const match = DTSTART_WITH_TZID.exec(ruleString);
  if (!match) return RRule.fromString(ruleString).after(after, false);

  const [, tzid = "UTC", yr, mo, dy, hh, mm, ss] = match;
  const dtstart = new Date(
    Date.UTC(
      Number(yr),
      Number(mo) - 1,
      Number(dy),
      Number(hh),
      Number(mm),
      Number(ss),
    ),
  );
  const parsed = RRule.fromString(ruleString.replace(/DTSTART[^\n]+\n?/, ""));
  const rule = new RRule({ ...parsed.origOptions, dtstart, tzid: null });
  const next = rule.after(toFloating(after, tzid), false);
  return next ? fromFloating(next, tzid) : null;
}
