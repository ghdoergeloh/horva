import { describe, expect, it } from "vitest";

import { buildArcPath, lighten } from "./chartUtils";

describe("lighten", () => {
  it("mixes a color with white", () => {
    expect(lighten("#000000")).toBe("rgb(128,128,128)");
    expect(lighten("#6366f1", 0)).toBe("rgb(99,102,241)");
    expect(lighten("6366f1", 1)).toBe("rgb(255,255,255)");
  });
});

describe("buildArcPath", () => {
  it("draws a small slice with the short arc", () => {
    expect(buildArcPath(50, 50, 10, 0, Math.PI / 2)).toMatch(
      /^M 50 50 L 60 50 A 10 10 0 0 1 50(\.\d+)? 60 Z$/,
    );
  });

  it("uses the long arc for more than half a circle", () => {
    expect(buildArcPath(0, 0, 1, 0, 1.5 * Math.PI)).toContain(" 0 1 1 ");
  });
});
