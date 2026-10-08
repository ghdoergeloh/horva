import { describe, expect, it } from "vitest";

import {
  formatClock,
  formatDuration,
  formatPercent,
  formatSignedDuration,
} from "./duration";

describe("formatDuration", () => {
  it("writes hours and two-digit minutes", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(445)).toBe("7:25");
    expect(formatDuration(1412)).toBe("23:32");
  });

  it("rounds parts of a minute", () => {
    expect(formatDuration(59.6)).toBe("1:00");
  });

  it("writes negative values with a minus sign", () => {
    expect(formatDuration(-508)).toBe("−8:28");
  });
});

describe("formatSignedDuration", () => {
  it("always shows the sign", () => {
    expect(formatSignedDuration(-508)).toBe("−8:28");
    expect(formatSignedDuration(65)).toBe("+1:05");
  });

  it("shows zero without a sign", () => {
    expect(formatSignedDuration(0)).toBe("0:00");
  });

  it("uses the given format for the amount", () => {
    expect(formatSignedDuration(-90, (m) => `${String(m / 60)} h`)).toBe(
      "−1.5 h",
    );
  });
});

describe("formatClock", () => {
  it("writes hours, minutes and seconds with two digits", () => {
    expect(formatClock(6127)).toBe("01:42:07");
    expect(formatClock(0)).toBe("00:00:00");
    expect(formatClock(36_000)).toBe("10:00:00");
  });

  it("never goes below zero and drops parts of a second", () => {
    expect(formatClock(-5)).toBe("00:00:00");
    expect(formatClock(59.9)).toBe("00:00:59");
  });
});

describe("formatPercent", () => {
  it("rounds to whole percent", () => {
    expect(formatPercent(30.6)).toBe("31\u202F%");
  });
});
