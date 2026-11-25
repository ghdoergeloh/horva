import type { TWMergeConfig } from "tailwind-variants/config";
import { createTV, extendTailwindMerge } from "tailwind-variants/config";

/**
 * The text styles of `tooling/tailwind/theme.css`. Without them, the
 * merger takes `text-body` for a text color and drops the real color class
 * next to it. Custom merge configs need the `tailwind-variants/config` entry.
 *
 * The built-in rules of tailwind-variants let a font size remove an earlier
 * `leading-*`. In Tailwind 4 `leading-*` wins in any order, so both stay.
 * Only the `text-sm/6` form sets the line height and still replaces it.
 */
const twMergeConfig = {
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display",
            "title",
            "heading",
            "body",
            "body-strong",
            "small",
            "caption",
          ],
        },
      ],
    },
  },
  override: {
    conflictingClassGroups: { "font-size": [] },
  },
} satisfies TWMergeConfig;

/** twMerge that knows the theme's text styles. */
export const twMerge = extendTailwindMerge(twMergeConfig);

/** tailwind-variants that knows the theme's text styles. */
export const tv = createTV({ twMergeConfig });
