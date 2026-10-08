import { describe, expect, it } from "vitest";

import { rruleFromString } from "./rrule.js";

describe("rruleFromString", () => {
  it("converts a DTSTART with TZID to the correct UTC time", () => {
    const rule = rruleFromString(
      "DTSTART;TZID=Europe/Berlin:20260601T110000\nRRULE:FREQ=WEEKLY;BYDAY=MO",
    );

    expect(rule.options.dtstart.toISOString()).toBe("2026-06-01T09:00:00.000Z");
    expect(rule.options.tzid).toBe("Europe/Berlin");
    expect(rule.options.freq).toBe(rruleFromString("FREQ=WEEKLY").options.freq);
  });

  it("uses the winter offset for a date in winter", () => {
    const rule = rruleFromString(
      "DTSTART;TZID=Europe/Berlin:20260105T110000\nRRULE:FREQ=DAILY",
    );

    expect(rule.options.dtstart.toISOString()).toBe("2026-01-05T10:00:00.000Z");
  });

  it("parses a rule without TZID as it is", () => {
    const rule = rruleFromString(
      "DTSTART:20260601T110000Z\nRRULE:FREQ=DAILY;COUNT=2",
    );

    expect(rule.options.dtstart.toISOString()).toBe("2026-06-01T11:00:00.000Z");
    expect(rule.all()).toHaveLength(2);
  });
});
