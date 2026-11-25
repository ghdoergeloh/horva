import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { root } from "./scripts";

/**
 * Dependabot updates the pin of an action in some workflows and not in
 * others (a workflow only one repository has, for example). One action, one
 * pin keeps every workflow on the same version.
 */

const files = globSync(
  [".github/workflows/*.yml", "tooling/github/**/action.yml"],
  { cwd: root },
);

/** Every pinned action with the set of commits it is pinned to. */
function pins(): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  for (const file of files) {
    const text = readFileSync(path.join(root, file), "utf8");
    for (const [, action = "", sha = ""] of text.matchAll(
      /uses:\s*([^@\s]+)@([0-9a-f]{40})/g,
    ))
      result.set(action, (result.get(action) ?? new Set()).add(sha));
  }
  return result;
}

describe("the GitHub Actions", () => {
  it("finds the workflows", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("pin each action to one commit", () => {
    const multiple = [...pins()]
      .filter(([, shas]) => shas.size > 1)
      .map(([action]) => action);
    expect(multiple).toEqual([]);
  });
});
