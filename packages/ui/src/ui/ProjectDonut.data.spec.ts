import { describe, expect, it } from "vitest";

import type { ProjectShare } from "./ProjectDonut.data";
import {
  arcPath,
  donutArcs,
  donutSlices,
  OTHERS_COLOR,
  OTHERS_KEY,
  polar,
  roundedPercents,
  WITHOUT_TASK_COLOR,
} from "./ProjectDonut.data";

const share = (id: number, minutes: number): ProjectShare => ({
  id,
  name: `P${String(id)}`,
  color: `project-${String(id)}`,
  minutes,
});

describe("roundedPercents", () => {
  it("adds up to exactly 100", () => {
    const percents = roundedPercents([1, 1, 1]);
    expect(percents).toEqual([34, 33, 33]);
    expect(percents.reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("gives the missing points to the largest remainders", () => {
    expect(roundedPercents([437, 390, 328, 144, 112, 1])).toEqual([
      31, 28, 23, 10, 8, 0,
    ]);
  });

  it("returns zeros for an empty total", () => {
    expect(roundedPercents([0, 0])).toEqual([0, 0]);
  });
});

describe("donutSlices", () => {
  it("sorts by time, largest first, and drops empty projects", () => {
    const slices = donutSlices([share(1, 30), share(2, 0), share(3, 90)]);
    expect(slices.map((s) => s.id)).toEqual([3, 1]);
    expect(slices.map((s) => s.percent)).toEqual([75, 25]);
  });

  it("puts time without a task last, in the neutral color", () => {
    const slices = donutSlices([
      {
        id: "none",
        name: "ohne Aufgabe",
        color: null,
        minutes: 500,
        isWithoutTask: true,
      },
      share(1, 30),
    ]);
    expect(slices.map((s) => s.id)).toEqual([1, "none"]);
    expect(slices[1]?.color).toBe(WITHOUT_TASK_COLOR);
    expect(slices[1]?.isWithoutTask).toBe(true);
  });

  it("keeps up to 8 projects as they are", () => {
    const shares = Array.from({ length: 8 }, (_, i) => share(i + 1, 100 - i));
    expect(donutSlices(shares)).toHaveLength(8);
    expect(donutSlices(shares).some((s) => s.id === OTHERS_KEY)).toBe(false);
  });

  it("groups the smallest projects into Others from 9 projects on", () => {
    const shares = Array.from({ length: 10 }, (_, i) => share(i + 1, 100 - i));
    const slices = donutSlices(shares, { othersLabel: "Others" });
    expect(slices).toHaveLength(8);
    const others = slices[7];
    expect(others).toMatchObject({
      id: OTHERS_KEY,
      name: "Others",
      color: OTHERS_COLOR,
      minutes: 93 + 92 + 91,
    });
    expect(others?.grouped.map((s) => s.id)).toEqual([8, 9, 10]);
  });

  it("does not count time without a task as a project", () => {
    const shares = [
      ...Array.from({ length: 8 }, (_, i) => share(i + 1, 50)),
      {
        id: "none",
        name: "ohne Aufgabe",
        color: null,
        minutes: 5,
        isWithoutTask: true,
      },
    ];
    const slices = donutSlices(shares);
    expect(slices).toHaveLength(9);
    expect(slices.some((s) => s.id === OTHERS_KEY)).toBe(false);
  });

  it("honours a smaller limit", () => {
    const shares = Array.from({ length: 4 }, (_, i) => share(i + 1, 10));
    expect(donutSlices(shares, { maxProjects: 3 }).map((s) => s.id)).toEqual([
      1,
      2,
      OTHERS_KEY,
    ]);
  });

  it("returns nothing without time", () => {
    expect(donutSlices([share(1, 0)])).toEqual([]);
  });
});

describe("donutArcs", () => {
  it("splits the full circle by share, clockwise from the top", () => {
    const arcs = donutArcs([1, 3]);
    expect(arcs[0]).toEqual({ start: 0, end: Math.PI / 2 });
    expect(arcs[1]?.start).toBe(Math.PI / 2);
    expect(arcs[1]?.end).toBeCloseTo(Math.PI * 2);
  });

  it("gives empty arcs for an empty total", () => {
    expect(donutArcs([0])).toEqual([{ start: 0, end: 0 }]);
  });
});

describe("polar", () => {
  it("measures angles from twelve o'clock", () => {
    const right = polar(90, 90, 70, Math.PI / 2);
    expect(right.x).toBeCloseTo(160);
    expect(right.y).toBeCloseTo(90);
  });
});

describe("arcPath", () => {
  it("draws a quarter arc", () => {
    expect(arcPath(90, 90, 70, { start: 0, end: Math.PI / 2 })).toBe(
      "M90 20A70 70 0 0 1 160 90",
    );
  });

  it("sets the large-arc flag beyond half a circle", () => {
    expect(arcPath(90, 90, 70, { start: 0, end: Math.PI * 1.5 })).toContain(
      " 0 1 1 ",
    );
  });

  it("draws a full circle as two halves", () => {
    expect(arcPath(90, 90, 70, { start: 0, end: Math.PI * 2 })).toBe(
      "M90 20A70 70 0 1 1 90 160A70 70 0 1 1 90 20",
    );
  });
});
