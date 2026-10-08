import { extendTailwindMerge } from "tailwind-merge";
import { createTV } from "tailwind-variants";

/**
 * The text styles of `tooling/tailwind/theme.css`. Without them,
 * tailwind-merge takes `text-body` for a text color and drops the real
 * color class next to it.
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
};

/** tailwind-merge that knows the theme's text styles. */
export const twMerge = extendTailwindMerge(twMergeConfig);

/** tailwind-variants that knows the theme's text styles. */
export const tv = createTV({ twMergeConfig });
