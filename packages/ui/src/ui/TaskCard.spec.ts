import { describe, expect, it } from "vitest";

import type { TaskCardKeyState } from "./TaskCard";
import { taskCardShortcut } from "./TaskCard";

const open: TaskCardKeyState = {
  onCard: true,
  canToggleDone: true,
  isDone: false,
  isRunning: false,
  canPlanToday: true,
  canOpenDate: true,
};

describe("taskCardShortcut", () => {
  it("maps the keys of an open task", () => {
    expect(taskCardShortcut(" ", open)).toBe("toggleDone");
    expect(taskCardShortcut("s", open)).toBe("start");
    expect(taskCardShortcut("H", open)).toBe("planToday");
    expect(taskCardShortcut("d", open)).toBe("openDate");
    expect(taskCardShortcut("x", open)).toBeNull();
  });

  it("leaves Space to the buttons inside the card", () => {
    expect(taskCardShortcut(" ", { ...open, onCard: false })).toBeNull();
    expect(taskCardShortcut("s", { ...open, onCard: false })).toBe("start");
  });

  it("stops a running task with S", () => {
    expect(taskCardShortcut("S", { ...open, isRunning: true })).toBe("stop");
  });

  it("does not start a done task", () => {
    expect(taskCardShortcut("s", { ...open, isDone: true })).toBeNull();
  });

  it("ignores keys whose action is not there", () => {
    const none = {
      ...open,
      canToggleDone: false,
      canPlanToday: false,
      canOpenDate: false,
    };
    expect(taskCardShortcut(" ", none)).toBeNull();
    expect(taskCardShortcut("h", none)).toBeNull();
    expect(taskCardShortcut("d", none)).toBeNull();
  });
});
