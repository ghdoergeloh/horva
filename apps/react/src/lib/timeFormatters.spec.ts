import { describe, expect, it } from "vitest";

import { applyTimeString, fmt, fmtDuration } from "./timeFormatters";

describe("fmt", () => {
  it("shows hours and minutes with two digits", () => {
    expect(fmt(new Date(2026, 5, 3, 7, 5))).toBe("07:05");
    expect(fmt(new Date(2026, 5, 3, 23, 59).toISOString())).toBe("23:59");
  });
});

describe("fmtDuration", () => {
  it("shows minutes below an hour", () => {
    expect(fmtDuration(0)).toBe("0min");
    expect(fmtDuration(59 * 60_000)).toBe("59min");
  });

  it("shows full hours without minutes", () => {
    expect(fmtDuration(2 * 3_600_000)).toBe("2h");
  });

  it("shows hours and the minutes left", () => {
    expect(fmtDuration(90 * 60_000)).toBe("1h 30min");
  });

  it("rounds to the nearest minute", () => {
    expect(fmtDuration(89.6 * 60_000)).toBe("1h 30min");
  });
});

describe("applyTimeString", () => {
  it("sets the time of day and keeps the date", () => {
    const base = new Date(2026, 5, 3, 9, 41, 17).toISOString();
    const result = new Date(applyTimeString(base, "14:05"));
    expect([result.getFullYear(), result.getMonth(), result.getDate()]).toEqual(
      [2026, 5, 3],
    );
    expect([
      result.getHours(),
      result.getMinutes(),
      result.getSeconds(),
    ]).toEqual([14, 5, 0]);
  });
});
