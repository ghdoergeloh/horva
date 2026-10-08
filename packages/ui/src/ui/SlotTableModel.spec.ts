import { describe, expect, it } from "vitest";

import { checkDraft, clockOf, draftMinutes, withGaps } from "./SlotTableModel";

const at = (hours: number, minutes = 0) => new Date(2026, 9, 7, hours, minutes);

describe("withGaps", () => {
  it("adds a gap between slots that do not touch", () => {
    const a = { start: at(9), end: at(10) };
    const b = { start: at(10), end: at(12, 2) };
    const c = { start: at(13, 5), end: at(14) };
    expect(withGaps([c, a, b])).toEqual([
      { kind: "slot", slot: a },
      { kind: "slot", slot: b },
      { kind: "gap", start: at(12, 2), end: at(13, 5) },
      { kind: "slot", slot: c },
    ]);
  });

  it("adds no gap for less than a minute or for overlaps", () => {
    const rows = withGaps([
      { start: at(9), end: at(11) },
      { start: at(10), end: at(10, 30) },
      { start: new Date(2026, 9, 7, 11, 0, 30), end: at(12) },
    ]);
    expect(rows.every((row) => row.kind === "slot")).toBe(true);
  });

  it("adds no gap after a running slot", () => {
    const rows = withGaps([
      { start: at(9), end: null },
      { start: at(11), end: at(12) },
    ]);
    expect(rows.map((row) => row.kind)).toEqual(["slot", "slot"]);
  });

  it("is empty without slots", () => {
    expect(withGaps([])).toEqual([]);
  });
});

describe("checkDraft", () => {
  const nine = { hour: 9, minute: 0 };
  const ten = { hour: 10, minute: 0 };

  it("accepts an end after the start", () => {
    expect(checkDraft({ start: nine, end: ten }, false)).toBe(null);
  });

  it("needs a start and, for a finished slot, an end", () => {
    expect(checkDraft({ start: null, end: ten }, false)).toBe("missingTime");
    expect(checkDraft({ start: nine, end: null }, false)).toBe("missingTime");
    expect(checkDraft({ start: nine, end: null }, true)).toBe(null);
  });

  it("refuses an end at or before the start", () => {
    expect(checkDraft({ start: ten, end: ten }, false)).toBe(
      "endNotAfterStart",
    );
    expect(checkDraft({ start: ten, end: nine }, false)).toBe(
      "endNotAfterStart",
    );
  });
});

describe("draftMinutes", () => {
  it("counts the minutes of a draft", () => {
    expect(
      draftMinutes({
        start: { hour: 9, minute: 27 },
        end: clockOf(at(10, 16)),
      }),
    ).toBe(49);
  });

  it("is null when a time is missing or the end is before the start", () => {
    expect(draftMinutes({ start: null, end: { hour: 9, minute: 0 } })).toBe(
      null,
    );
    expect(
      draftMinutes({
        start: { hour: 10, minute: 0 },
        end: { hour: 9, minute: 0 },
      }),
    ).toBe(null);
  });
});
