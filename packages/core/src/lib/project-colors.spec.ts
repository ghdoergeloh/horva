import { describe, expect, it } from "vitest";

import {
  nextProjectColor,
  PROJECT_COLOR_HEX,
  PROJECT_COLOR_PATTERN,
  PROJECT_COLOR_TOKENS,
  projectColorHex,
} from "./project-colors.js";

describe("PROJECT_COLOR_TOKENS", () => {
  it("lists the 18 presets in order", () => {
    expect(PROJECT_COLOR_TOKENS).toHaveLength(18);
    expect(PROJECT_COLOR_TOKENS[0]).toBe("project-1");
    expect(PROJECT_COLOR_TOKENS[17]).toBe("project-18");
  });

  it("has a hex value for every token and for no project", () => {
    for (const token of [...PROJECT_COLOR_TOKENS, "project-none"])
      expect(PROJECT_COLOR_HEX[token], token).toMatch(/^#[0-9a-f]{6}$/);
  });
});

describe("PROJECT_COLOR_PATTERN", () => {
  it.each([
    ["project-1", true],
    ["project-9", true],
    ["project-18", true],
    ["project-none", true],
    ["#6366f1", true],
    ["#6366F1", true],
    ["project-0", false],
    ["project-19", false],
    ["project-deleted", false],
    ["#fff", false],
    ["#6366f1aa", false],
    ["red", false],
    ["", false],
  ])("%s is valid: %s", (value, valid) => {
    expect(PROJECT_COLOR_PATTERN.test(value)).toBe(valid);
  });
});

describe("projectColorHex", () => {
  it("resolves a token to its light value", () => {
    expect(projectColorHex("project-3")).toBe("#008777");
  });

  it("keeps a custom hex value", () => {
    expect(projectColorHex("#123456")).toBe("#123456");
  });
});

describe("nextProjectColor", () => {
  it("starts with project-1", () => {
    expect(nextProjectColor([])).toBe("project-1");
  });

  it("takes the next unused color in order", () => {
    expect(nextProjectColor(["project-1", "project-2"])).toBe("project-3");
  });

  it("takes the least used color, the lowest number on a tie", () => {
    const used = [
      ...PROJECT_COLOR_TOKENS.slice(0, 8),
      "project-1",
      "project-3",
      "project-2",
    ];
    expect(nextProjectColor(used)).toBe("project-4");
  });

  it("fills a gap that a changed project left", () => {
    expect(nextProjectColor(["project-1", "project-3", "project-4"])).toBe(
      "project-2",
    );
  });

  it("ignores custom colors and the colors after project-8", () => {
    expect(nextProjectColor(["#123456", "project-9", "project-12"])).toBe(
      "project-1",
    );
  });

  it("starts again with project-1 when all eight are used once", () => {
    expect(nextProjectColor(PROJECT_COLOR_TOKENS.slice(0, 8))).toBe(
      "project-1",
    );
  });
});
