import { describe, expect, it } from "vitest";

import {
  elapsedSeconds,
  lastUsedProjectId,
  nextProjectColor,
  workedMinutes,
} from "./timerRules";

describe("lastUsedProjectId", () => {
  it("is the project of the task that was started last", () => {
    expect(
      lastUsedProjectId([
        { projectId: 1, slots: [{ startedAt: "2026-06-03T08:00:00Z" }] },
        {
          projectId: 2,
          slots: [
            { startedAt: "2026-06-02T08:00:00Z" },
            { startedAt: "2026-06-03T09:30:00Z" },
          ],
        },
        { projectId: 3, slots: [] },
      ]),
    ).toBe(2);
  });

  it("is null when no task was ever started", () => {
    expect(lastUsedProjectId([{ projectId: 1, slots: [] }])).toBeNull();
    expect(lastUsedProjectId([])).toBeNull();
  });
});

describe("nextProjectColor", () => {
  it("starts with project-1", () => {
    expect(nextProjectColor([])).toBe("project-1");
  });

  it("takes the least used of project-1 to project-8", () => {
    expect(
      nextProjectColor([
        { color: "project-1" },
        { color: "project-2" },
        { color: "project-3" },
      ]),
    ).toBe("project-4");
    expect(
      nextProjectColor(
        Array.from({ length: 8 }, (_, i) => ({ color: `project-${i + 1}` })),
      ),
    ).toBe("project-1");
  });

  it("takes the smallest number on a tie and ignores custom colors", () => {
    expect(
      nextProjectColor([
        { color: "project-1" },
        { color: "project-1" },
        { color: "project-2" },
        { color: "custom" },
        { color: "project-12" },
        ...Array.from({ length: 6 }, (_, i) => ({ color: `project-${i + 3}` })),
      ]),
    ).toBe("project-2");
  });
});

describe("elapsedSeconds", () => {
  const now = new Date("2026-06-03T10:00:00Z").getTime();

  it("counts the whole seconds since the start", () => {
    expect(elapsedSeconds("2026-06-03T09:58:30.400Z", now)).toBe(89);
  });

  it("is zero without a slot or for a start in the future", () => {
    expect(elapsedSeconds(null, now)).toBe(0);
    expect(elapsedSeconds("2026-06-03T10:00:05Z", now)).toBe(0);
  });
});

describe("workedMinutes", () => {
  it("adds the whole minutes of the running slot to the closed ones", () => {
    expect(workedMinutes(90, 0)).toBe(90);
    expect(workedMinutes(90, 59)).toBe(90);
    expect(workedMinutes(90, 61)).toBe(91);
    expect(workedMinutes(0, 3600)).toBe(60);
  });
});
