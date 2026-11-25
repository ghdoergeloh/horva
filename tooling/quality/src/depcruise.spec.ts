import { createRequire } from "node:module";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { root } from "./scripts";

/**
 * Rules in .dependency-cruiser.cjs that point at node_modules only work when
 * the exclude option keeps installed packages in the graph. Each exclude
 * pattern must therefore match workspace paths only.
 */

const require = createRequire(import.meta.url);
const config = require(path.join(root, ".dependency-cruiser.cjs")) as {
  options: { exclude: { path: string[] } };
};
const patterns = config.options.exclude.path.map(
  (pattern) => new RegExp(pattern),
);

const installed = ["out", "dist", "coverage", "storybook-static"].map(
  (folder) =>
    `node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/${folder}/index.js`,
);

describe("exclude option of dependency-cruiser", () => {
  it.each(installed)("keeps the installed file %s", (file) => {
    expect(patterns.filter((pattern) => pattern.test(file))).toEqual([]);
  });

  it.each([
    "apps/react/out/main.js",
    "packages/ui/dist/index.js",
    "packages/ui/coverage/index.js",
    "packages/ui/storybook-static/index.js",
    "packages/ui/src/button.spec.tsx",
  ])("drops the workspace file %s", (file) => {
    expect(patterns.some((pattern) => pattern.test(file))).toBe(true);
  });
});
