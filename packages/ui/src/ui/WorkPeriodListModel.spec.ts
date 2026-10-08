import { describe, expect, it } from "vitest";

import {
  dayCopyText,
  periodCopyText,
  sumPeriods,
  withBreaks,
} from "./WorkPeriodListModel";

const at = (hours: number, minutes = 0) => new Date(2026, 9, 7, hours, minutes);
const now = at(18, 30);

const morning = { start: at(9, 20), end: at(12, 2) };
const afternoon = { start: at(13, 5), end: at(18, 12) };

describe("copy texts", () => {
  it("writes one period as from–to", () => {
    expect(periodCopyText(morning, now)).toBe("09:20–12:02");
  });

  it("ends a running period now", () => {
    expect(periodCopyText({ start: at(13, 5), end: null }, now)).toBe(
      "13:05–18:30",
    );
  });

  it("joins the periods of a day in time order", () => {
    expect(dayCopyText([afternoon, morning], now)).toBe(
      "09:20–12:02, 13:05–18:12",
    );
  });

  it("is empty for a day without periods", () => {
    expect(dayCopyText([], now)).toBe("");
  });
});

describe("withBreaks", () => {
  it("puts a break between two periods", () => {
    expect(withBreaks([afternoon, morning], now)).toEqual([
      { kind: "period", period: morning },
      { kind: "break", start: morning.end, end: afternoon.start },
      { kind: "period", period: afternoon },
    ]);
  });

  it("adds no break between touching or overlapping periods", () => {
    const rows = withBreaks(
      [
        { start: at(9), end: at(10) },
        { start: at(10), end: at(11) },
        { start: at(10, 30), end: at(12) },
      ],
      now,
    );
    expect(rows.map((row) => row.kind)).toEqual(["period", "period", "period"]);
  });
});

describe("withBreaks with a period inside another", () => {
  it("measures a break from the latest end so far", () => {
    const rows = withBreaks(
      [
        { start: at(9), end: at(12) },
        { start: at(10), end: at(11) },
        { start: at(11, 30), end: at(13) },
        { start: at(14), end: at(15) },
      ],
      now,
    );
    expect(rows.filter((row) => row.kind === "break")).toEqual([
      { kind: "break", start: at(13), end: at(14) },
    ]);
  });
});

describe("sumPeriods", () => {
  it("sums work and breaks", () => {
    expect(sumPeriods([morning, afternoon], now)).toEqual({
      work: 162 + 307,
      breaks: 63,
    });
  });

  it("counts a running period up to now", () => {
    expect(sumPeriods([{ start: at(18), end: null }], now)).toEqual({
      work: 30,
      breaks: 0,
    });
  });
});
