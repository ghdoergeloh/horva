import { describe, expect, it } from "vitest";

import { parsePeriod } from "./log.js";

describe("parsePeriod", () => {
  it("defaults to today when undefined", () => {
    expect(parsePeriod(undefined)).toBe("today");
  });

  it("passes through valid periods", () => {
    for (const p of ["today", "yesterday", "week", "month", "all"] as const) {
      expect(parsePeriod(p)).toBe(p);
    }
  });

  it("falls back to today for an invalid period", () => {
    expect(parsePeriod("whenever")).toBe("today");
  });
});
