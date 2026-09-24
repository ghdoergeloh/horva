"use client";

import type { ColorSwatchProps } from "react-aria-components";
import { ColorSwatch as AriaColorSwatch } from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

export function ColorSwatch(props: ColorSwatchProps) {
  return (
    <AriaColorSwatch
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "border-foreground/10 box-border h-8 w-8 rounded-md border",
      )}
      style={({ color }) => ({
        background: `linear-gradient(${color.toString()}, ${color.toString()}),
          repeating-conic-gradient(#CCC 0% 25%, white 0% 50%) 50% / 16px 16px`,
      })}
    />
  );
}
