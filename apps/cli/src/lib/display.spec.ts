import chalk from "chalk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { colorProject } from "./display.js";

describe("colorProject", () => {
  const level = chalk.level;
  beforeEach(() => {
    chalk.level = 3;
  });
  afterEach(() => {
    chalk.level = level;
  });

  it("shows a token name in the light value of the token", () => {
    expect(colorProject("Web", "project-3")).toBe(chalk.hex("#008777")("Web"));
  });

  it("shows a custom hex color as it is", () => {
    expect(colorProject("Web", "#123456")).toBe(chalk.hex("#123456")("Web"));
  });

  it("shows the name without color for an unknown value", () => {
    expect(colorProject("Web", "not a color")).toBe("Web");
  });
});
