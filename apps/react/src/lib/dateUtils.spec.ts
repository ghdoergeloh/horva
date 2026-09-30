import { describe, expect, it } from "vitest";

import { endOfDay, localDateStr, startOfDay } from "./dateUtils";

const noon = new Date(2026, 5, 3, 12, 30);

describe("startOfDay and endOfDay", () => {
  it("span the whole local day", () => {
    expect(startOfDay(noon)).toEqual(new Date(2026, 5, 3, 0, 0, 0, 0));
    expect(endOfDay(noon)).toEqual(new Date(2026, 5, 3, 23, 59, 59, 999));
  });

  it("leave the given date unchanged", () => {
    startOfDay(noon);
    endOfDay(noon);
    expect(noon).toEqual(new Date(2026, 5, 3, 12, 30));
  });
});

describe("localDateStr", () => {
  it("writes the local date as YYYY-MM-DD", () => {
    expect(localDateStr(new Date(2026, 0, 9, 23, 59))).toBe("2026-01-09");
    expect(localDateStr(new Date(2026, 11, 31).toISOString())).toBe(
      "2026-12-31",
    );
  });
});
