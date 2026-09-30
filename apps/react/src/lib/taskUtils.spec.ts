import { afterEach, describe, expect, it, vi } from "vitest";

import i18n from "#/i18n/index.js";
import { calcTotalMinutes, formatScheduledDate } from "./taskUtils";

afterEach(() => {
  vi.useRealTimers();
});

describe("calcTotalMinutes", () => {
  it("adds the closed slots and skips the running one", () => {
    expect(
      calcTotalMinutes([
        { startedAt: "2026-06-03T08:00:00Z", endedAt: "2026-06-03T08:45:00Z" },
        { startedAt: "2026-06-03T09:00:00Z", endedAt: "2026-06-03T10:30:00Z" },
        { startedAt: "2026-06-03T11:00:00Z", endedAt: null },
      ]),
    ).toBe(135);
  });
});

describe("formatScheduledDate", () => {
  it("names today and tomorrow and adds a time of day", async () => {
    await i18n.changeLanguage("en");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 3, 9, 0));
    expect(formatScheduledDate(new Date(2026, 5, 3))).toBe(
      i18n.t("taskUtils.today"),
    );
    expect(formatScheduledDate(new Date(2026, 5, 4, 14, 30))).toBe(
      `${i18n.t("taskUtils.tomorrow")} 02:30 PM`,
    );
    expect(formatScheduledDate(new Date(2026, 5, 10))).toBe("Jun 10");
  });
});
