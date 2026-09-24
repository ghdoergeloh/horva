"use client";

import type React from "react";
import type { PopoverProps as AriaPopoverProps } from "react-aria-components";
import {
  Popover as AriaPopover,
  composeRenderProps,
  OverlayArrow,
} from "react-aria-components";
import { tv } from "tailwind-variants";

export interface PopoverProps extends Omit<AriaPopoverProps, "children"> {
  showArrow?: boolean;
  children: React.ReactNode;
}

const styles = tv({
  base: "font-sans bg-popover forced-colors:bg-[Canvas] shadow-2xl rounded-xl bg-clip-padding border border-border text-popover-foreground outline-0",
  variants: {
    isEntering: {
      true: "animate-in fade-in placement-bottom:slide-in-from-top-1 placement-top:slide-in-from-bottom-1 placement-left:slide-in-from-right-1 placement-right:slide-in-from-left-1 ease-out duration-200",
    },
    isExiting: {
      true: "animate-out fade-out placement-bottom:slide-out-to-top-1 placement-top:slide-out-to-bottom-1 placement-left:slide-out-to-right-1 placement-right:slide-out-to-left-1 ease-in duration-150",
    },
  },
});

export function Popover({
  children,
  showArrow,
  className,
  ...props
}: PopoverProps) {
  const offset = showArrow ? 12 : 8;
  return (
    <AriaPopover
      offset={offset}
      {...props}
      className={composeRenderProps(className, (className, renderProps) =>
        styles({ ...renderProps, className }),
      )}
    >
      {showArrow && (
        <OverlayArrow className="group">
          <svg
            width={12}
            height={12}
            viewBox="0 0 12 12"
            className="group-placement-bottom:rotate-180 group-placement-left:-rotate-90 group-placement-right:rotate-90 fill-popover stroke-border block stroke-1 forced-colors:fill-[Canvas] forced-colors:stroke-[ButtonBorder]"
          >
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
      )}
      {children}
    </AriaPopover>
  );
}
