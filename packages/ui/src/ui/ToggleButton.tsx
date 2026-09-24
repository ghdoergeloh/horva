"use client";

import type { ToggleButtonProps } from "react-aria-components";
import {
  composeRenderProps,
  ToggleButton as RACToggleButton,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { focusRing } from "@horva/ui";

const styles = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center gap-2 border border-border h-9 box-border px-3.5 [&:has(>svg:only-child)]:px-0 [&:has(>svg:only-child)]:h-8 [&:has(>svg:only-child)]:aspect-square font-sans text-sm text-center transition rounded-lg cursor-default forced-color-adjust-none [-webkit-tap-highlight-color:transparent]",
  variants: {
    isSelected: {
      false:
        "bg-secondary hover:bg-secondary/80 pressed:bg-secondary/60 text-secondary-foreground forced-colors:bg-[ButtonFace]! forced-colors:text-[ButtonText]!",
      true: "bg-primary hover:bg-primary/90 pressed:bg-primary/80 text-primary-foreground forced-colors:bg-[Highlight]! forced-colors:text-[HighlightText]!",
    },
    isDisabled: {
      true: "border-transparent bg-muted forced-colors:bg-[ButtonFace]! text-muted-foreground/50 forced-colors:text-[GrayText]!",
    },
  },
});

export function ToggleButton(props: ToggleButtonProps) {
  return (
    <RACToggleButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, className }),
      )}
    />
  );
}
