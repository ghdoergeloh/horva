import { describe, expect, it } from "vitest";

import { nextOccurrence } from "./rrule.js";

describe("nextOccurrence", () => {
  it("keeps the wall-clock time of a rule with TZID in winter", () => {
    const next = nextOccurrence(
      "DTSTART;TZID=Europe/Berlin:20261125T110000\nRRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      new Date("2026-11-25T08:00:00Z"),
    );

    // 11:00 in Berlin is 10:00 UTC in winter
    expect(next?.toISOString()).toBe("2026-11-25T10:00:00.000Z");
  });

  it("keeps the wall-clock time of a rule with TZID in summer", () => {
    const next = nextOccurrence(
      "DTSTART;TZID=Europe/Berlin:20260601T110000\nRRULE:FREQ=WEEKLY;BYDAY=MO",
      new Date("2026-06-02T00:00:00Z"),
    );

    expect(next?.toISOString()).toBe("2026-06-08T09:00:00.000Z");
  });

  it("keeps the wall-clock time across a daylight saving change", () => {
    const next = nextOccurrence(
      "DTSTART;TZID=Europe/Berlin:20261020T110000\nRRULE:FREQ=DAILY",
      new Date("2026-11-02T12:00:00Z"),
    );

    expect(next?.toISOString()).toBe("2026-11-03T10:00:00.000Z");
  });

  it("returns an occurrence later the same day when the time has not passed", () => {
    const next = nextOccurrence(
      "DTSTART;TZID=America/New_York:20261101T090000\nRRULE:FREQ=DAILY",
      new Date("2026-11-25T13:59:00Z"),
    );

    expect(next?.toISOString()).toBe("2026-11-25T14:00:00.000Z");
  });

  it("parses a rule without TZID as it is", () => {
    const next = nextOccurrence(
      "DTSTART:20260601T110000Z\nRRULE:FREQ=DAILY;COUNT=2",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(next?.toISOString()).toBe("2026-06-02T11:00:00.000Z");
  });

  it("returns null when the rule has no further occurrence", () => {
    const next = nextOccurrence(
      "DTSTART;TZID=Europe/Berlin:20260601T110000\nRRULE:FREQ=DAILY;COUNT=1",
      new Date("2026-07-01T00:00:00Z"),
    );

    expect(next).toBeNull();
  });
});
