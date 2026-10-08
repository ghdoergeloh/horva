import { describe, expect, it } from "vitest";

import {
  dayTotal,
  hourAxis,
  projectMinutes,
  stackDay,
  valueLabelY,
  weekStarts,
} from "./HoursPerDay.data";

describe("hourAxis", () => {
  it("holds a target of 8 hours with room above it", () => {
    expect(hourAxis(475, 480)).toEqual({
      max: 600,
      ticks: [0, 120, 240, 360, 480, 600],
    });
  });

  it("grows with the longest day", () => {
    const axis = hourAxis(11 * 60, 480);
    expect(axis.max).toBe(12 * 60);
    expect(axis.ticks).toHaveLength(4);
  });

  it("uses one-hour steps for short days", () => {
    expect(hourAxis(150).ticks).toEqual([0, 60, 120, 180]);
  });

  it("shows two hours when there is no time and no target", () => {
    expect(hourAxis(0)).toEqual({ max: 120, ticks: [0, 60, 120] });
  });

  it("keeps the number of lines small for very long days", () => {
    const axis = hourAxis(30 * 60);
    expect(axis.ticks.length).toBeLessThanOrEqual(6);
    expect(axis.max).toBeGreaterThanOrEqual(30 * 60);
  });
});

describe("stackDay", () => {
  it("stacks in legend order and skips empty parts", () => {
    expect(
      stackDay(
        [
          { projectId: "b", minutes: 30 },
          { projectId: "a", minutes: 445 },
          { projectId: "c", minutes: 0 },
        ],
        ["a", "b", "c"],
      ),
    ).toEqual([
      { projectId: "a", minutes: 445, from: 0, to: 445 },
      { projectId: "b", minutes: 30, from: 445, to: 475 },
    ]);
  });

  it("drops projects that are not in the legend", () => {
    const parts = stackDay(
      [
        { projectId: "x", minutes: 10 },
        { projectId: "a", minutes: 20 },
      ],
      ["a"],
    );
    expect(parts).toEqual([{ projectId: "a", minutes: 20, from: 0, to: 20 }]);
  });
});

describe("dayTotal", () => {
  it("adds the parts of a day", () => {
    expect(
      dayTotal({
        date: "2026-10-05",
        label: "Mo",
        minutes: [
          { projectId: 1, minutes: 445 },
          { projectId: 2, minutes: 30 },
        ],
      }),
    ).toBe(475);
  });

  it("counts only the projects of the legend when given", () => {
    const day = {
      date: "2026-10-05",
      label: "Mo",
      minutes: [
        { projectId: 1, minutes: 445 },
        { projectId: 9, minutes: 30 },
      ],
    };
    expect(dayTotal(day, [1, 2])).toBe(445);
  });
});

describe("projectMinutes", () => {
  it("adds the parts of one project and ignores negative values", () => {
    const day = {
      date: "2026-10-05",
      label: "Mo",
      minutes: [
        { projectId: 1, minutes: 30 },
        { projectId: 2, minutes: 45 },
        { projectId: 1, minutes: 15 },
        { projectId: 1, minutes: -5 },
      ],
    };
    expect(projectMinutes(day, 1)).toBe(45);
    expect(projectMinutes(day, 3)).toBe(0);
  });
});

describe("weekStarts", () => {
  it("marks each Monday after the first day", () => {
    // 2026-10-01 is a Thursday, 2026-10-05 and 2026-10-12 are Mondays.
    const dates = Array.from(
      { length: 14 },
      (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`,
    );
    expect(weekStarts(dates)).toEqual([4, 11]);
  });

  it("does not mark a Monday that is the first day", () => {
    expect(weekStarts(["2026-10-05", "2026-10-06"])).toEqual([]);
  });
});

describe("valueLabelY", () => {
  it("sits a few pixels above the column", () => {
    expect(valueLabelY(100, undefined)).toBe(94);
    expect(valueLabelY(100, 40)).toBe(94);
  });

  it("moves above a target line that the text would cross", () => {
    expect(valueLabelY(45, 40)).toBe(36);
  });

  it("stays when the column is above the target line", () => {
    expect(valueLabelY(30, 40)).toBe(24);
  });
});
