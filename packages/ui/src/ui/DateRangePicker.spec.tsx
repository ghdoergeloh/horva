import { parseDate, parseDateTime } from "@internationalized/date";
import { describe, expect, it } from "vitest";

import {
  defaultDateRangePresets,
  isRangeAllowed,
  rangeDayCount,
  rangeLike,
  shiftRange,
} from "./DateRangePicker";

const range = (start: string, end: string) => ({
  start: parseDate(start),
  end: parseDate(end),
});

describe("shiftRange", () => {
  it("moves a week by seven days", () => {
    expect(shiftRange(range("2025-03-10", "2025-03-16"), 1)).toEqual(
      range("2025-03-17", "2025-03-23"),
    );
  });

  it("moves a whole month to the whole next or previous month", () => {
    expect(shiftRange(range("2025-01-01", "2025-01-31"), 1)).toEqual(
      range("2025-02-01", "2025-02-28"),
    );
    expect(shiftRange(range("2025-03-01", "2025-03-31"), -1)).toEqual(
      range("2025-02-01", "2025-02-28"),
    );
  });

  it("moves several whole months by their number", () => {
    expect(shiftRange(range("2025-01-01", "2025-03-31"), 1)).toEqual(
      range("2025-04-01", "2025-06-30"),
    );
  });

  it("moves any other range by its number of days", () => {
    expect(shiftRange(range("2025-03-05", "2025-03-07"), -1)).toEqual(
      range("2025-03-02", "2025-03-04"),
    );
  });

  it("keeps the time of date-time values", () => {
    const shifted = shiftRange(
      {
        start: parseDateTime("2025-03-10T08:00"),
        end: parseDateTime("2025-03-10T17:00"),
      },
      1,
    );
    expect(shifted.start.toString()).toBe("2025-03-11T08:00:00");
    expect(shifted.end.toString()).toBe("2025-03-11T17:00:00");
  });
});

describe("rangeDayCount", () => {
  it("counts both ends", () => {
    expect(rangeDayCount(range("2025-03-10", "2025-03-16"))).toBe(7);
    expect(rangeDayCount(range("2025-03-10", "2025-03-10"))).toBe(1);
  });
});

describe("defaultDateRangePresets", () => {
  // A Wednesday.
  const presets = defaultDateRangePresets(parseDate("2025-03-12"));
  const byId = Object.fromEntries(presets.map((p) => [p.id, p]));

  it("lists the presets of the design in order", () => {
    expect(presets.map((p) => p.label)).toEqual([
      "Heute",
      "Gestern",
      "Diese Woche",
      "Letzte Woche",
      "Dieser Monat",
      "Letzter Monat",
      "Letzte 30 Tage",
    ]);
  });

  it("starts weeks on Monday", () => {
    expect(byId["thisWeek"]?.range).toEqual(range("2025-03-10", "2025-03-16"));
    expect(byId["lastWeek"]?.range).toEqual(range("2025-03-03", "2025-03-09"));
  });

  it("covers whole months and 30 days up to today", () => {
    expect(byId["lastMonth"]?.range).toEqual(range("2025-02-01", "2025-02-28"));
    expect(byId["last30Days"]?.range).toEqual(
      range("2025-02-11", "2025-03-12"),
    );
  });
});

describe("rangeLike", () => {
  it("turns preset days into date-times that keep the times of the value", () => {
    const shifted = rangeLike(
      range("2025-03-10", "2025-03-16"),
      {
        start: parseDateTime("2025-01-01T08:00"),
        end: parseDateTime("2025-01-02T17:00"),
      },
      true,
    );
    expect(shifted.start.toString()).toBe("2025-03-10T08:00:00");
    expect(shifted.end.toString()).toBe("2025-03-16T17:00:00");
  });

  it("uses midnight without a value", () => {
    const shifted = rangeLike(range("2025-03-10", "2025-03-16"), null, true);
    expect(shifted.start.toString()).toBe("2025-03-10T00:00:00");
    expect(shifted.end.toString()).toBe("2025-03-16T00:00:00");
  });

  it("keeps plain dates for a date range", () => {
    expect(rangeLike(range("2025-03-10", "2025-03-16"), null, false)).toEqual(
      range("2025-03-10", "2025-03-16"),
    );
  });
});

describe("isRangeAllowed", () => {
  const bounds = {
    minValue: parseDate("2025-03-01"),
    maxValue: parseDate("2025-03-31"),
  };

  it("allows a range inside the bounds", () => {
    expect(isRangeAllowed(range("2025-03-10", "2025-03-16"), bounds)).toBe(
      true,
    );
  });

  it("rejects a range that crosses a bound", () => {
    expect(isRangeAllowed(range("2025-03-25", "2025-04-02"), bounds)).toBe(
      false,
    );
    expect(isRangeAllowed(range("2025-02-25", "2025-03-02"), bounds)).toBe(
      false,
    );
  });

  it("rejects a range with an unavailable day inside", () => {
    expect(
      isRangeAllowed(range("2025-03-10", "2025-03-16"), {
        isDateUnavailable: (date) => date.day === 12,
      }),
    ).toBe(false);
  });

  it("allows unavailable days inside when the range may skip them", () => {
    expect(
      isRangeAllowed(range("2025-03-10", "2025-03-16"), {
        isDateUnavailable: (date) => date.day === 12,
        allowsNonContiguousRanges: true,
      }),
    ).toBe(true);
  });
});
