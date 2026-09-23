"use client";

import type { SliderProps as AriaSliderProps } from "react-aria-components";
import {
  Slider as AriaSlider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@repo/ui";

import { Label } from "./Field";

const trackStyles = tv({
  base: "rounded-full",
  variants: {
    orientation: {
      horizontal: "w-full h-[6px]",
      vertical: "h-full w-[6px] ml-[50%] -translate-x-[50%]",
    },
    isDisabled: {
      false: "bg-border forced-colors:bg-[ButtonBorder]",
      true: "bg-border/50 forced-colors:bg-[ButtonBorder]",
    },
  },
});

const fillStyles = tv({
  base: "absolute rounded-full",
  variants: {
    orientation: {
      horizontal: "w-(--size) h-[6px] start-(--start,0)",
      vertical:
        "h-(--size) w-[6px] bottom-(--start,0) ml-[50%] -translate-x-[50%]",
    },
    isDisabled: {
      false: "bg-primary forced-colors:bg-[Highlight]",
      true: "bg-border forced-colors:bg-[GrayText]",
    },
  },
});

const thumbStyles = tv({
  extend: focusRing,
  base: "w-4.5 h-4.5 group-orientation-horizontal:mt-5 group-orientation-vertical:ml-2.5 rounded-full bg-background border border-primary",
  variants: {
    isDragging: {
      true: "bg-primary forced-colors:bg-[ButtonBorder]",
    },
    isDisabled: {
      true: "border-border forced-colors:border-[GrayText]",
    },
  },
});

export interface SliderProps<T> extends AriaSliderProps<T> {
  label?: string;
  thumbLabels?: string[];
}

export function Slider<T extends number | number[]>({
  label,
  thumbLabels,
  ...props
}: SliderProps<T>) {
  return (
    <AriaSlider
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "orientation-horizontal:grid orientation-vertical:flex orientation-horizontal:w-64 orientation-horizontal:max-w-[calc(100%-10px)] grid-cols-[1fr_auto] flex-col items-center gap-2 font-sans",
      )}
    >
      <Label>{label}</Label>
      <SliderOutput className="orientation-vertical:hidden text-muted-foreground text-sm">
        {({ state }) =>
          state.values.map((_, i) => state.getThumbValueLabel(i)).join(" – ")
        }
      </SliderOutput>
      <SliderTrack className="group orientation-horizontal:h-5 orientation-vertical:w-5 orientation-vertical:h-38 col-span-2 flex items-center">
        {({ state, ...renderProps }) => (
          <>
            <div className={trackStyles(renderProps)} />
            {state.values.length === 1 ? (
              // Single thumb, render fill from the end
              <div
                className={fillStyles(renderProps)}
                style={
                  {
                    "--size": state.getThumbPercent(0) * 100 + "%",
                  } as React.CSSProperties
                }
              />
            ) : state.values.length === 2 ? (
              // Range slider, render fill between the thumbs
              <div
                className={fillStyles(renderProps)}
                style={
                  {
                    "--start": state.getThumbPercent(0) * 100 + "%",
                    "--size":
                      (state.getThumbPercent(1) - state.getThumbPercent(0)) *
                        100 +
                      "%",
                  } as React.CSSProperties
                }
              />
            ) : null}
            {state.values.map((_, i) => (
              <SliderThumb
                key={i}
                index={i}
                aria-label={thumbLabels?.[i] ?? ""}
                className={thumbStyles}
              />
            ))}
          </>
        )}
      </SliderTrack>
    </AriaSlider>
  );
}
