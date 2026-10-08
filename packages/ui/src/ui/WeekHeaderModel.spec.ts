import { describe, expect, it } from "vitest";

import {
  addDays,
  formatWeekRange,
  isNextWeekInFuture,
} from "./WeekHeaderModel";

/** The title with plain spaces; Intl puts thin spaces around the dash. */
const title = (start: Date, locale?: string) =>
  formatWeekRange(start, locale).replace(/\s/g, " ");

describe("formatWeekRange", () => {
  it("names the month once inside one month", () => {
    expect(title(new Date(2026, 9, 5))).toBe("5.–11. Oktober 2026");
  });

  it("names both months across a month border", () => {
    expect(title(new Date(2026, 8, 28))).toBe(
      "28. September – 4. Oktober 2026",
    );
  });

  it("names both years across a year border", () => {
    expect(title(new Date(2026, 11, 28))).toBe(
      "28. Dezember 2026 – 3. Januar 2027",
    );
  });
});

describe("formatWeekRange in English", () => {
  it("follows the locale", () => {
    expect(title(new Date(2026, 9, 5), "en-US")).toBe("October 5 – 11, 2026");
  });
});

describe("week checks", () => {
  const monday = new Date(2026, 9, 5);

  it("knows when the next week lies in the future", () => {
    expect(isNextWeekInFuture(monday, new Date(2026, 9, 8))).toBe(true);
    expect(isNextWeekInFuture(monday, new Date(2026, 9, 12, 8))).toBe(false);
  });

  it("adds days over a month border", () => {
    expect(addDays(new Date(2026, 9, 30), 3)).toEqual(new Date(2026, 10, 2));
  });
});
