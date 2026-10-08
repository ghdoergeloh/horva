"use client";

import type { MeterProps as AriaMeterProps } from "react-aria-components";
import { AlertTriangle } from "lucide-react";
import { Meter as AriaMeter } from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

import { Label } from "./Field";

export interface MeterProps extends AriaMeterProps {
  label?: string;
}

export function Meter({ label, ...props }: MeterProps) {
  return (
    <AriaMeter
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "flex max-w-full flex-col gap-2 font-sans",
      )}
    >
      {({ percentage, valueText }) => (
        <>
          <div className="flex justify-between gap-2">
            <Label>{label}</Label>
            <span
              className={`text-sm ${percentage >= 80 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {percentage >= 80 && (
                <AlertTriangle
                  aria-label="Alert"
                  className="inline-block h-4 w-4 align-text-bottom"
                />
              )}
              {" " + valueText}
            </span>
          </div>
          <div className="bg-muted relative h-2 w-64 max-w-full rounded-full outline outline-1 -outline-offset-1 outline-transparent">
            <div
              className={`absolute top-0 left-0 h-full rounded-full ${getColor(percentage)} forced-colors:bg-[Highlight]`}
              style={{ width: percentage + "%" }}
            />
          </div>
        </>
      )}
    </AriaMeter>
  );
}

function getColor(percentage: number) {
  if (percentage < 70) {
    return "bg-success";
  }

  if (percentage < 80) {
    return "bg-warning";
  }

  return "bg-destructive";
}
