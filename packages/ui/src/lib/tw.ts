import type { TWMergeConfig } from "tailwind-variants/config";
import { createTV, extendTailwindMerge } from "tailwind-variants/config";

/**
 * Merge rules for Tailwind 4. The built-in rules of tailwind-variants let a
 * font size remove an earlier `leading-*`. In Tailwind 4 `leading-*` wins in
 * any order, so both stay. Only the `text-sm/6` form sets the line height and
 * still replaces it. Custom merge configs need the `tailwind-variants/config`
 * entry.
 */
const twMergeConfig = {
  override: {
    conflictingClassGroups: { "font-size": [] },
  },
} satisfies TWMergeConfig;

/** twMerge with the merge rules of this design system. */
export const twMerge = extendTailwindMerge(twMergeConfig);

/** tailwind-variants with the merge rules of this design system. */
export const tv = createTV({ twMergeConfig });
