import { describe, expect, it } from "vitest";

import { resolveColor } from "./project.js";

describe("resolveColor", () => {
  it.each([
    ["red", "project-10"],
    ["Blue", "project-13"],
    ["3", "project-3"],
    ["project-12", "project-12"],
    ["#12AB34", "#12ab34"],
  ])("resolves %s to %s", (input, stored) => {
    expect(resolveColor(input)).toBe(stored);
  });
});
