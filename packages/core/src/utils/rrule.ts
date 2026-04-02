import { createRequire } from "module";
import type { RRule as RRuleType } from "rrule";

const _require = createRequire(import.meta.url);
const { RRule } = _require("rrule") as { RRule: typeof RRuleType };

// rrule.js v2.x does not correctly handle DTSTART;TZID= when parsing from string:
// it ignores the timezone offset and treats the wall-clock time as UTC, producing
// wrong dtstart values (e.g. 11:00 Europe/Berlin stored as 11:00Z instead of 09:00Z).
// These helpers work around that by extracting the local time and TZID from the string,
// converting to UTC manually via the Intl API, and constructing the RRule directly.

function getUTCOffsetMinutes(date: Date, tzid: string): number {
  const utcStr = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = date.toLocaleString("en-US", { timeZone: tzid });
  return (new Date(tzStr).getTime() - new Date(utcStr).getTime()) / 60000;
}

function fromString(str: string): RRuleType {
  const dtMatch =
    /DTSTART;TZID=([^:\n]+):(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/.exec(
      str,
    );
  if (dtMatch) {
    const [, tzid, yr, mo, dy, hh, mm, ss] = dtMatch;
    if (!tzid || !yr || !mo || !dy || !hh || !mm || !ss)
      return RRule.fromString(str);
    const approxUTC = new Date(`${yr}-${mo}-${dy}T${hh}:${mm}:${ss}Z`);
    const offsetMinutes = getUTCOffsetMinutes(approxUTC, tzid);
    const dtstart = new Date(approxUTC.getTime() - offsetMinutes * 60000);
    const ruleOnly = str.replace(/DTSTART[^\n]+\n?/, "");
    const parsed = RRule.fromString(ruleOnly);
    return new RRule({ ...parsed.origOptions, dtstart, tzid });
  }
  return RRule.fromString(str);
}

export { RRule, fromString as rruleFromString };
