"use client";

import type { ColorThumbProps } from "react-aria-components";
import { ColorThumb as AriaColorThumb } from "react-aria-components";
import { tv } from "tailwind-variants";

const thumbStyles = tv({
  base: "w-4.5 h-4.5 top-[50%] left-[50%] rounded-full border-2 border-white box-border",
  variants: {
    isFocusVisible: {
      true: "w-8 h-8",
    },
    isDragging: {
      true: "bg-foreground forced-colors:bg-[ButtonBorder]",
    },
    isDisabled: {
      true: "border-border forced-colors:border-[GrayText] bg-muted forced-colors:bg-[GrayText]",
    },
  },
});

export function ColorThumb(props: ColorThumbProps) {
  return (
    <AriaColorThumb
      {...props}
      style={({ defaultStyle, isDisabled }) => ({
        ...defaultStyle,
        backgroundColor: isDisabled ? undefined : defaultStyle.backgroundColor,
        boxShadow: "0 0 0 1px black, inset 0 0 0 1px black",
      })}
      className={thumbStyles}
    />
  );
}
