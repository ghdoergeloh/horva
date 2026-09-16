import { afterEach, describe, expect, it, vi } from "vitest";

import { parseDate, parseId } from "./task.js";

describe("parseId", () => {
  it("parses a plain numeric string", () => {
    expect(parseId("42")).toBe(42);
  });

  it("strips a leading #", () => {
    expect(parseId("#42")).toBe(42);
  });

  it("throws for a non-numeric string", () => {
    expect(() => parseId("abc")).toThrow("Invalid ID: abc");
  });
});

describe("parseDate", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves 'today' to the start of the current local day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 17, 15, 30));
    const d = parseDate("today");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 17]);
    expect([d.getHours(), d.getMinutes(), d.getSeconds()]).toEqual([0, 0, 0]);
  });

  it("resolves 'tomorrow' to the start of the next local day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 17, 15, 30));
    const d = parseDate("tomorrow");
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 5, 18]);
  });

  it("parses an explicit date string", () => {
    const d = parseDate("2026-07-01");
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(6);
    expect(d.getUTCDate()).toBe(1);
  });

  it("throws for an unparseable string", () => {
    expect(() => parseDate("not a date")).toThrow("Invalid date: not a date");
  });
});
