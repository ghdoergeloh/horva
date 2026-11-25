import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * pnpm-workspace.yaml names the Node.js major inside Electron in three
 * places: the `electron` catalog and two peer rules for vite and vitest.
 * e2e/node-version.spec.ts checks the catalog against Electron itself; this
 * keeps the peer rules on the catalog.
 */
const workspace = readFileSync(
  resolve(import.meta.dirname, "../../../../pnpm-workspace.yaml"),
  "utf8",
);

/** The value of `key:` in the block that starts at `header`. */
function valueIn(header: string, key: string): string | undefined {
  const block = workspace.slice(workspace.indexOf(header));
  return new RegExp(`^\\s+${key}:\\s*(\\S+)$`, "m").exec(block)?.[1];
}

describe("the Node.js types of the Electron app", () => {
  const catalog = valueIn("\n  electron:\n", '"@types/node"');

  it("come from the electron catalog", () => {
    expect(catalog).toMatch(/^\^\d+\./);
  });

  it.each(["vite", "vitest"])(
    "are allowed as the peer of %s in the same range",
    (parent) => {
      expect(
        valueIn("\npeerDependencyRules:\n", `"${parent}>@types/node"`),
      ).toBe(catalog);
    },
  );
});
