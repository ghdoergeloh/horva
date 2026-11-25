import { describe, expect, it, vi } from "vitest";

import { nextOccurrence } from "./rrule.js";

// Simulates a bundler that loads the ESM build of rrule: named exports and
// no default export.
vi.mock("rrule", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const exports = (actual["default"] ?? actual) as Record<string, unknown>;
  return { ...exports, default: undefined };
});

describe("nextOccurrence with the ESM build of rrule", () => {
  it("parses a rule", () => {
    const next = nextOccurrence(
      "DTSTART:20260601T110000Z\nRRULE:FREQ=DAILY;COUNT=3",
      new Date("2026-06-01T12:00:00Z"),
    );

    expect(next?.toISOString()).toBe("2026-06-02T11:00:00.000Z");
  });
});
