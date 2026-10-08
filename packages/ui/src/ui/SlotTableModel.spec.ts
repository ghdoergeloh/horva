import { describe, expect, it } from "vitest";

import {
  checkDraft,
  clockOf,
  draftMinutes,
  endsNextDay,
  withGaps,
} from "./SlotTableModel";

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
  const now = at(11, 42);

  it("accepts an end after the start", () => {
    expect(checkDraft({ start: nine, end: ten }, false, now)).toBe(null);
  });

  it("needs a start and, for a finished slot, an end", () => {
    expect(checkDraft({ start: null, end: ten }, false, now)).toBe(
      "missingTime",
    );
    expect(checkDraft({ start: nine, end: null }, false, now)).toBe(
      "missingTime",
    );
    expect(checkDraft({ start: nine, end: null }, true, now)).toBe(null);
  });

  it("refuses an end equal to the start", () => {
    expect(checkDraft({ start: ten, end: ten }, false, now)).toBe(
      "endNotAfterStart",
    );
  });

  it("takes an end before the start as the next day", () => {
    expect(checkDraft({ start: ten, end: nine }, false, now)).toBe(null);
    expect(endsNextDay({ start: { hour: 23, minute: 0 }, end: nine })).toBe(
      true,
    );
    expect(endsNextDay({ start: nine, end: ten })).toBe(false);
    expect(endsNextDay({ start: nine, end: null })).toBe(false);
  });

  it("refuses a start after now for a running slot", () => {
    expect(
      checkDraft({ start: { hour: 12, minute: 0 }, end: null }, true, now),
    ).toBe("startAfterNow");
    expect(
      checkDraft({ start: { hour: 11, minute: 42 }, end: null }, true, now),
    ).toBe(null);
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

  it("counts an end before the start on the next day", () => {
    expect(
      draftMinutes({
        start: { hour: 23, minute: 0 },
        end: { hour: 1, minute: 15 },
      }),
    ).toBe(135);
  });

  it("is null when a time is missing", () => {
    expect(draftMinutes({ start: null, end: { hour: 9, minute: 0 } })).toBe(
      null,
    );
  });
});
