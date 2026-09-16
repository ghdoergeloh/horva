import { describe, expect, it } from "vitest";

import {
  formatSlotRow,
  getPeriodRange,
  parseTime,
  slotDuration,
} from "./slotMgmt.js";

describe("parseTime", () => {
  it("applies HH:MM to the reference date", () => {
    const ref = new Date(2026, 5, 17, 8, 0);
    const t = parseTime("14:30", ref);
    expect([t.getFullYear(), t.getMonth(), t.getDate()]).toEqual([2026, 5, 17]);
    expect([t.getHours(), t.getMinutes()]).toEqual([14, 30]);
  });

  it("applies an explicit date when given 'HH:MM YYYY-MM-DD'", () => {
    const t = parseTime("09:15 2026-02-19", new Date(2026, 5, 17));
    expect([t.getFullYear(), t.getMonth(), t.getDate()]).toEqual([2026, 1, 19]);
    expect([t.getHours(), t.getMinutes()]).toEqual([9, 15]);
  });
});

describe("getPeriodRange", () => {
  it("defaults to today when empty", () => {
    const now = new Date();
    const { from, to } = getPeriodRange("");
    expect(from.getDate()).toBe(now.getDate());
    expect(to.getHours()).toBe(23);
  });

  it("resolves yesterday", () => {
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const { from } = getPeriodRange("yesterday");
    expect(from.getDate()).toBe(yesterday.getDate());
  });

  it("parses an explicit range", () => {
    const { from, to } = getPeriodRange("2026-02-10..2026-02-15");
    expect([from.getFullYear(), from.getMonth(), from.getDate()]).toEqual([
      2026, 1, 10,
    ]);
    expect([to.getFullYear(), to.getMonth(), to.getDate()]).toEqual([
      2026, 1, 15,
    ]);
    expect(to.getHours()).toBe(23);
  });

  it("parses a specific date", () => {
    const { from, to } = getPeriodRange("2026-02-19");
    expect([from.getFullYear(), from.getMonth(), from.getDate()]).toEqual([
      2026, 1, 19,
    ]);
    expect(from.getHours()).toBe(0);
    expect(to.getHours()).toBe(23);
  });

  it("falls back to today for unparseable input", () => {
    const now = new Date();
    const { from } = getPeriodRange("not a period");
    expect(from.getDate()).toBe(now.getDate());
  });
});

describe("slotDuration", () => {
  it("returns the duration in minutes for a closed slot", () => {
    const mins = slotDuration({
      startedAt: new Date("2026-06-01T09:00:00Z"),
      endedAt: new Date("2026-06-01T10:15:00Z"),
    });
    expect(mins).toBe(75);
  });

  it("returns 0 for a still-open slot", () => {
    expect(slotDuration({ startedAt: new Date(), endedAt: null })).toBe(0);
  });
});

describe("formatSlotRow", () => {
  it("shows the task name and project for a task slot", () => {
    const row = formatSlotRow({
      id: 3,
      startedAt: new Date("2026-06-01T09:00:00Z"),
      endedAt: new Date("2026-06-01T10:00:00Z"),
      task: {
        id: 7,
        name: "Design review",
        project: { name: "Client A", color: "#ffffff" },
      },
    });
    expect(row).toContain("#7 Design review");
    expect(row).toContain("Client A");
  });

  it("shows no task reference for a slot without a task", () => {
    const row = formatSlotRow({
      id: 4,
      startedAt: new Date("2026-06-01T09:00:00Z"),
      endedAt: new Date("2026-06-01T10:00:00Z"),
      task: null,
    });
    expect(row).not.toContain("#");
  });

  it("marks an open slot instead of an end time", () => {
    const row = formatSlotRow({
      id: 5,
      startedAt: new Date("2026-06-01T09:00:00Z"),
      endedAt: null,
      task: null,
    });
    expect(row).toContain("...");
  });
});
