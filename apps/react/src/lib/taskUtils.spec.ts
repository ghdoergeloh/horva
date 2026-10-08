import { CalendarDate } from "@internationalized/date";
import { afterEach, describe, expect, it, vi } from "vitest";

import i18n from "#/i18n/index.js";
import {
  calcTotalMinutes,
  formatScheduledDate,
  labelChanges,
  onDayKeepingTime,
  scheduleState,
} from "./taskUtils";

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

describe("onDayKeepingTime", () => {
  const day = new CalendarDate(2026, 6, 5);

  it("keeps the time of day of the planned date", () => {
    const planned = new Date(2026, 5, 3, 14, 30);
    expect(onDayKeepingTime(day, planned)).toEqual(
      new Date(2026, 5, 5, 14, 30),
    );
  });

  it("takes midnight without a planned date", () => {
    expect(onDayKeepingTime(day, null)).toEqual(new Date(2026, 5, 5, 0, 0));
  });
});

describe("scheduleState", () => {
  const now = new Date(2026, 5, 3, 10, 0);

  it("is today for any time on the same day", () => {
    expect(scheduleState(new Date(2026, 5, 3, 23, 0), now)).toEqual({
      isPlannedToday: true,
      isOverdue: false,
    });
  });

  it("is overdue for an earlier day", () => {
    expect(scheduleState(new Date(2026, 5, 2, 23, 59), now)).toEqual({
      isPlannedToday: false,
      isOverdue: true,
    });
  });

  it("is neither for a later day or no date", () => {
    const neither = { isPlannedToday: false, isOverdue: false };
    expect(scheduleState(new Date(2026, 5, 4, 0, 0), now)).toEqual(neither);
    expect(scheduleState(null, now)).toEqual(neither);
  });
});

describe("labelChanges", () => {
  it("adds the new labels and removes the dropped ones", () => {
    expect(labelChanges(new Set([1, 2]), new Set([2, 3]))).toEqual({
      addLabelIds: [3],
      removeLabelIds: [1],
    });
  });

  it("changes nothing for the same labels", () => {
    expect(labelChanges(new Set([1]), new Set([1]))).toEqual({
      addLabelIds: [],
      removeLabelIds: [],
    });
  });
});
