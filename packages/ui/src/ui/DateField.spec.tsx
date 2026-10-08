import { parseDate, parseDateTime } from "@internationalized/date";
import { describe, expect, it } from "vitest";

import { dateLike, isDateAllowed } from "./DateField";

describe("isDateAllowed", () => {
  const bounds = {
    minValue: parseDate("2025-03-05"),
    maxValue: parseDate("2025-03-25"),
    isDateUnavailable: (date: { day: number }) => date.day === 15,
  };

  it("allows days inside the bounds, both ends included", () => {
    expect(isDateAllowed(parseDate("2025-03-05"), bounds)).toBe(true);
    expect(isDateAllowed(parseDate("2025-03-25"), bounds)).toBe(true);
  });

  it("rejects days before the minimum and after the maximum", () => {
    expect(isDateAllowed(parseDate("2025-03-04"), bounds)).toBe(false);
    expect(isDateAllowed(parseDate("2025-03-26"), bounds)).toBe(false);
  });

  it("rejects unavailable days", () => {
    expect(isDateAllowed(parseDate("2025-03-15"), bounds)).toBe(false);
  });

  it("compares days, not times", () => {
    expect(
      isDateAllowed(parseDateTime("2025-03-25T23:00"), {
        maxValue: parseDateTime("2025-03-25T08:00"),
      }),
    ).toBe(true);
  });

  it("allows every day without bounds", () => {
    expect(isDateAllowed(parseDate("1999-01-01"), {})).toBe(true);
  });
});

describe("dateLike", () => {
  const day = parseDate("2025-03-14");

  it("keeps the time of a date-time value", () => {
    expect(
      dateLike(day, parseDateTime("2025-01-01T17:30"), true).toString(),
    ).toBe("2025-03-14T17:30:00");
  });

  it("uses midnight for a date-time field without a value", () => {
    expect(dateLike(day, null, true).toString()).toBe("2025-03-14T00:00:00");
  });

  it("stays a plain date without time", () => {
    expect(dateLike(day, null, false).toString()).toBe("2025-03-14");
  });
});
