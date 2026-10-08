import { describe, expect, it, vi } from "vitest";

import { rruleFromString } from "./rrule.js";

// Simulates a bundler that loads the ESM build of rrule: named exports and
// no default export.
vi.mock("rrule", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  const exports = (actual["default"] ?? actual) as Record<string, unknown>;
  return { ...exports, default: undefined };
});

describe("rruleFromString with the ESM build of rrule", () => {
  it("parses a rule", () => {
    const rule = rruleFromString(
      "DTSTART:20260601T110000Z\nRRULE:FREQ=DAILY;COUNT=3",
    );

    expect(rule.all()).toHaveLength(3);
  });
});
