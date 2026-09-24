"use client";

import type { ColorAreaProps as AriaColorAreaProps } from "react-aria-components";
import { ColorArea as AriaColorArea } from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

import { ColorThumb } from "./ColorThumb";

export interface ColorAreaProps extends AriaColorAreaProps {}

export function ColorArea(props: ColorAreaProps) {
  return (
    <AriaColorArea
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "bg-muted aspect-square w-full max-w-56 rounded-lg forced-colors:bg-[GrayText]",
      )}
      style={({ defaultStyle, isDisabled }) => ({
        ...defaultStyle,
        background: isDisabled ? undefined : defaultStyle.background,
      })}
    >
      <ColorThumb />
    </AriaColorArea>
  );
}
