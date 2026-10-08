"use client";

import type { ReactNode } from "react";
import type { SwitchFieldProps, ValidationResult } from "react-aria-components";
import { SwitchButton, SwitchField } from "react-aria-components";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import { tv } from "../lib/tw";
import { Description, FieldError } from "./Field";

export interface SwitchProps extends Omit<SwitchFieldProps, "children"> {
  children: ReactNode;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

const track = tv({
  extend: focusRing,
  base: "flex h-5 w-9 box-border px-px items-center shrink-0 cursor-default rounded-full transition duration-200 ease-in-out shadow-inner border border-transparent font-sans",
  variants: {
    isSelected: {
      false: "bg-input group-pressed:bg-muted border-input-border",
      true: "bg-primary forced-colors:bg-[Highlight]! group-pressed:bg-primary/80",
    },
    isDisabled: {
      true: "opacity-45 forced-colors:group-selected:bg-[GrayText]! forced-colors:border-[GrayText]",
    },
  },
});

const handle = tv({
  base: "h-4 w-4 transform rounded-full outline outline-1 -outline-offset-1 outline-transparent shadow-sm transition duration-200 ease-in-out",
  variants: {
    isSelected: {
      false: "translate-x-0 bg-input-border",
      true: "translate-x-[100%] bg-primary-foreground",
    },
    isDisabled: {
      true: "forced-colors:outline-[GrayText]",
    },
  },
});

/**
 * A toggle switch with an optional description and error message below it.
 */
export function Switch({ children, ...props }: SwitchProps) {
  return (
    <SwitchField {...props} className="group flex flex-col gap-1">
      <SwitchButton
        className={composeTailwindRenderProps(
          props.className,
          "group text-foreground disabled:text-muted-foreground/50 relative flex items-center gap-2 text-sm transition [-webkit-tap-highlight-color:transparent] forced-colors:disabled:text-[GrayText]",
        )}
      >
        {(renderProps) => (
          <>
            <div className={track(renderProps)}>
              <span className={handle(renderProps)} />
            </div>
            {children}
          </>
        )}
      </SwitchButton>
      {props.description && <Description>{props.description}</Description>}
      <FieldError>{props.errorMessage}</FieldError>
    </SwitchField>
  );
}
