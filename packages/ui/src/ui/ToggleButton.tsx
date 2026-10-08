"use client";

import type { ToggleButtonProps } from "react-aria-components";
import { useContext } from "react";
import {
  composeRenderProps,
  ToggleButton as RACToggleButton,
} from "react-aria-components";

import { focusRing } from "@horva/ui";

import { tv } from "../lib/tw";
import { isIconOnly } from "./Button";
import { SegmentedContext } from "./ToggleButtonGroup";

const styles = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center gap-2 box-border font-sans font-medium text-center transition-colors cursor-default forced-color-adjust-none [-webkit-tap-highlight-color:transparent] [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  variants: {
    segmented: {
      false: "h-9 px-3.5 text-body rounded-md border border-transparent",
      true: "h-7 px-3 text-small rounded-sm outline-offset-1",
    },
    iconOnly: {
      true: "",
    },
    isSelected: {
      false:
        "text-secondary-foreground forced-colors:bg-[ButtonFace]! forced-colors:text-[ButtonText]!",
      true: "forced-colors:bg-[Highlight]! forced-colors:text-[HighlightText]!",
    },
    isDisabled: {
      true: "opacity-45 forced-colors:text-[GrayText]!",
    },
  },
  compoundVariants: [
    {
      segmented: false,
      iconOnly: true,
      class: "px-0 aspect-square",
    },
    {
      segmented: false,
      isSelected: false,
      class:
        "bg-secondary hover:bg-accent hover:text-accent-foreground pressed:bg-accent",
    },
    {
      segmented: false,
      isSelected: true,
      class:
        "bg-primary hover:bg-primary-hover pressed:bg-primary-hover text-primary-foreground",
    },
    {
      segmented: true,
      isSelected: false,
      class: "bg-transparent hover:text-foreground",
    },
    {
      segmented: true,
      isSelected: true,
      class: "bg-card text-foreground shadow-sm",
    },
  ],
});

/**
 * A button that stays pressed. Inside a segmented ToggleButtonGroup it is
 * one segment of the switch.
 */
export function ToggleButton(props: ToggleButtonProps) {
  const segmented = useContext(SegmentedContext);
  return (
    <RACToggleButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({
          ...renderProps,
          segmented,
          iconOnly: isIconOnly(props.children),
          className,
        }),
      )}
    />
  );
}
