import { describe, expect, it } from "vitest";

import { contract } from "@horva/contract";
import { PROJECT_COLOR_PATTERN } from "@horva/core";

const values = [
  "project-1",
  "project-9",
  "project-10",
  "project-18",
  "project-none",
  "#6366f1",
  "#6366F1",
  "project-0",
  "project-19",
  "project-deleted",
  "project-01",
  "#fff",
  "#6366f1aa",
  "6366f1",
  "red",
  "",
];

/**
 * The contract checks project colors with its own pattern, because it may
 * not import `@horva/core`. Both must accept the same values.
 */
describe("the project color rule of the contract", () => {
  const input = contract.project.create["~orpc"].inputSchema;

  it.each(values)("treats %j like PROJECT_COLOR_PATTERN", async (color) => {
    const result = await input?.["~standard"].validate({ name: "A", color });
    const accepted =
      result !== undefined && !("issues" in result && result.issues);
    expect(accepted).toBe(PROJECT_COLOR_PATTERN.test(color));
  });
});
