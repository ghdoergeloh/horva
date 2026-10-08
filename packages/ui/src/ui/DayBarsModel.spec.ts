import { describe, expect, it } from "vitest";

import {
  defaultHourRange,
  formatClock,
  formatDuration,
  formatHour,
  getHourRange,
  minutesBetween,
  minutesOnDay,
  placeSpan,
  totalMinutesOnDay,
} from "./DayBarsModel";

/** A local time on Monday, 5 October 2026, or a later day of that week. */
const at = (hours: number, minutes = 0, day = 5) =>
  new Date(2026, 9, day, hours, minutes);
const monday = at(0);
const tuesday = at(0, 0, 6);

describe("getHourRange", () => {
  it("falls back to 8 to 18 without slots", () => {
    expect(getHourRange([], at(12))).toEqual({ startHour: 8, endHour: 18 });
    expect(getHourRange([{ date: monday, spans: [] }], at(12))).toEqual(
      defaultHourRange,
    );
  });

  it("uses the given fallback", () => {
    expect(getHourRange([], at(12), { startHour: 6, endHour: 20 })).toEqual({
      startHour: 6,
      endHour: 20,
    });
  });

  it("rounds the earliest start down and the latest end up", () => {
    const range = getHourRange(
      [
        { date: monday, spans: [{ start: at(9, 5), end: at(12, 20) }] },
        { date: tuesday, spans: [{ start: at(13, 0, 6), end: at(17, 58, 6) }] },
      ],
      at(20, 0, 6),
    );
    expect(range).toEqual({ startHour: 9, endHour: 18 });
  });

  it("covers a running slot that is the only slot of the week", () => {
    const range = getHourRange(
      [{ date: monday, spans: [{ start: at(9, 20), end: null }] }],
      at(11, 42),
    );
    expect(range).toEqual({ startHour: 9, endHour: 12 });
  });

  it("grows with a running slot past the last end of the week", () => {
    const range = getHourRange(
      [
        { date: monday, spans: [{ start: at(9), end: at(17, 30) }] },
        {
          date: tuesday,
          spans: [
            { start: at(9, 0, 6), end: at(10, 0, 6) },
            { start: at(10, 0, 6), end: null },
          ],
        },
      ],
      at(19, 10, 6),
    );
    expect(range).toEqual({ startHour: 9, endHour: 20 });
  });

  it("cuts a slot across midnight at the border of its day", () => {
    const range = getHourRange(
      [{ date: monday, spans: [{ start: at(22, 30), end: at(1, 15, 6) }] }],
      at(12, 0, 7),
    );
    expect(range).toEqual({ startHour: 22, endHour: 24 });
  });

  it("starts at midnight for the part after midnight on the next day", () => {
    const range = getHourRange(
      [{ date: tuesday, spans: [{ start: at(22, 30), end: at(1, 15, 6) }] }],
      at(12, 0, 7),
    );
    expect(range).toEqual({ startHour: 0, endHour: 2 });
  });

  it("ignores spans that do not touch their day", () => {
    const range = getHourRange(
      [{ date: tuesday, spans: [{ start: at(9), end: at(10) }] }],
      at(12, 0, 7),
    );
    expect(range).toEqual(defaultHourRange);
  });
});

describe("minutesOnDay", () => {
  it("gives minutes since midnight", () => {
    expect(
      minutesOnDay({ start: at(9, 5), end: at(9, 12) }, monday, at(12)),
    ).toEqual({ start: 545, end: 552 });
  });

  it("ends a running span now", () => {
    expect(
      minutesOnDay({ start: at(10), end: null }, monday, at(11, 30)),
    ).toEqual({ start: 600, end: 690 });
  });

  it("is null for an empty span", () => {
    expect(minutesOnDay({ start: at(10), end: at(10) }, monday, at(12))).toBe(
      null,
    );
  });
});

describe("placeSpan", () => {
  const range = { startHour: 9, endHour: 19 };

  it("places a span in percent of the range", () => {
    expect(placeSpan({ start: 9 * 60 + 30, end: 10 * 60 + 30 }, range)).toEqual(
      { left: 5, width: 10 },
    );
  });

  it("never leaves the track", () => {
    expect(placeSpan({ start: 8 * 60, end: 20 * 60 }, range)).toEqual({
      left: 0,
      width: 100,
    });
    expect(placeSpan({ start: 18 * 60, end: 21 * 60 }, range)).toEqual({
      left: 90,
      width: 10,
    });
  });
});

describe("totalMinutesOnDay", () => {
  it("adds finished and running spans of the day", () => {
    const total = totalMinutesOnDay(
      [
        { start: at(9), end: at(9, 30) },
        { start: at(10), end: null },
      ],
      monday,
      at(10, 15),
    );
    expect(total).toBe(45);
  });

  it("counts only the part of a span on the day", () => {
    expect(
      totalMinutesOnDay([{ start: at(23), end: at(1, 0, 6) }], monday, at(12)),
    ).toBe(60);
  });
});

describe("formatting", () => {
  it("formats clock times, hours and durations", () => {
    expect(formatClock(at(9, 5))).toBe("09:05");
    expect(formatHour(7)).toBe("07:00");
    expect(formatDuration(463)).toBe("7:43");
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(-3)).toBe("0:00");
  });

  it("counts whole minutes between two dates", () => {
    expect(minutesBetween(at(9, 5), at(9, 12))).toBe(7);
    expect(minutesBetween(at(10), at(9))).toBe(0);
  });
});
