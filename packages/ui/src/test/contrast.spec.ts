import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { wcagContrast } from "culori";
import { describe, expect, it } from "vitest";

import { colorPairs, unpairedProjectColors } from "./color-pairs";
import { readThemes } from "./tokens";

const themes = readThemes();
const minimum = { text: 4.5, graphic: 3 } as const;

/**
 * The contrast of every token pair in both themes, computed from
 * `tooling/tailwind/theme.css`. The story tests check the contrast as
 * rendered; this test names the token pair that is too weak.
 */
describe.each(["light", "dark"] as const)("color contrast (%s)", (theme) => {
  it.each(colorPairs.map((pair) => [`${pair.fg} on ${pair.bg}`, pair]))(
    "%s",
    (_name, pair) => {
      const ratio = wcagContrast(
        themes[theme](pair.fg),
        themes[theme](pair.bg),
      );
      expect(ratio).toBeGreaterThanOrEqual(minimum[pair.kind]);
    },
  );
});

/**
 * Every project color in the theme needs a pair here, or a reason in
 * `unpairedProjectColors`, so a new color cannot skip the check.
 */
it("checks every project color", () => {
  const css = readFileSync(
    resolve(import.meta.dirname, "../../../../tooling/tailwind/theme.css"),
    "utf8",
  );
  const tokens = new Set(
    [...css.matchAll(/--(project-[\w-]+):/g)].map((match) => match[1]),
  );
  const paired = new Set(colorPairs.map((pair) => pair.fg));
  const missing = [...tokens].filter(
    (token) =>
      token !== undefined &&
      !paired.has(token) &&
      !unpairedProjectColors.includes(token),
  );
  expect(missing).toEqual([]);
});
