"use client";

import type { ToggleButtonGroupProps as RACToggleButtonGroupProps } from "react-aria-components";
import { createContext } from "react";
import {
  composeRenderProps,
  ToggleButtonGroup as RACToggleButtonGroup,
} from "react-aria-components";

import { tv } from "../lib/tw";

export interface ToggleButtonGroupProps extends RACToggleButtonGroupProps {
  /**
   * `segmented` is a switch between views ("Slots / Tasks / Work
   * periods"): one track, the selected segment raised.
   * @default 'separate'
   */
  variant?: "separate" | "segmented";
}

/** Tells a ToggleButton that it sits in a segmented group. */
export const SegmentedContext = createContext(false);

const styles = tv({
  base: "flex",
  variants: {
    variant: {
      separate: "gap-1",
      segmented: "inline-flex w-fit gap-0.5 rounded-md bg-secondary p-[3px]",
    },
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col",
    },
  },
});

export function ToggleButtonGroup({
  variant = "separate",
  ...props
}: ToggleButtonGroupProps) {
  return (
    <SegmentedContext.Provider value={variant === "segmented"}>
      <RACToggleButtonGroup
        {...props}
        className={composeRenderProps(
          props.className,
          (className, renderProps) =>
            styles({ ...renderProps, variant, className }),
        )}
      />
    </SegmentedContext.Provider>
  );
}
