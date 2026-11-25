import { globSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { root } from "./scripts";

/**
 * packages/ui/src/lib/tw.ts builds tv and twMerge with the merge rules for
 * Tailwind 4. Any other entry of tailwind-variants (the default one, /lite,
 * /merge, /config) brings back the built-in rules, which drop a leading-*
 * next to a later font size. Screens in apps/react use the components of
 * packages/ui and need no tailwind-variants at all.
 */

const sources = globSync(
  ["packages/ui/src/**/*.{ts,tsx}", "apps/react/src/**/*.{ts,tsx}"],
  { cwd: root },
).filter(
  // Screenshot folders carry the name of their test file.
  (file) =>
    file !== "packages/ui/src/lib/tw.ts" &&
    statSync(path.join(root, file)).isFile(),
);

describe("imports of tailwind-variants", () => {
  it("finds the sources", () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it("come only from packages/ui/src/lib/tw.ts", () => {
    const offenders = sources.filter((file) =>
      /from\s+["']tailwind-variants(\/[^"']*)?["']/.test(
        readFileSync(path.join(root, file), "utf8"),
      ),
    );
    expect(offenders).toEqual([]);
  });
});
