"use client";

import type { ProgressBarProps as AriaProgressBarProps } from "react-aria-components";
import { ProgressBar as AriaProgressBar } from "react-aria-components";

import { composeTailwindRenderProps } from "@repo/ui";

import { Label } from "./Field";

export interface ProgressBarProps extends AriaProgressBarProps {
  label?: string;
}

export function ProgressBar({ label, ...props }: ProgressBarProps) {
  return (
    <AriaProgressBar
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "flex w-64 max-w-full flex-col gap-2 font-sans",
      )}
    >
      {({ percentage, valueText, isIndeterminate }) => (
        <>
          <div className="flex justify-between gap-2">
            <Label>{label}</Label>
            <span className="text-muted-foreground text-sm">{valueText}</span>
          </div>
          <div className="bg-muted relative h-2 max-w-full overflow-hidden rounded-full outline outline-1 -outline-offset-1 outline-transparent">
            <div
              className={`bg-primary absolute top-0 h-full rounded-full forced-colors:bg-[Highlight] ${isIndeterminate ? "animate-in slide-in-from-left-[20rem] repeat-infinite left-full duration-1000 ease-out" : "left-0"}`}
              style={{ width: (isIndeterminate ? 40 : percentage) + "%" }}
            />
          </div>
        </>
      )}
    </AriaProgressBar>
  );
}
