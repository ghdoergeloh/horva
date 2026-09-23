"use client";

import type { ReactNode } from "react";
import type {
  RadioGroupProps as RACRadioGroupProps,
  RadioFieldProps,
  ValidationResult,
} from "react-aria-components";
import {
  composeRenderProps,
  RadioGroup as RACRadioGroup,
  RadioButton,
  RadioField,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@repo/ui";

import { Description, FieldError, Label } from "./Field";

export interface RadioGroupProps extends Omit<RACRadioGroupProps, "children"> {
  label?: string;
  children?: ReactNode;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function RadioGroup(props: RadioGroupProps) {
  return (
    <RACRadioGroup
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "group flex flex-col gap-2 font-sans",
      )}
    >
      <Label>{props.label}</Label>
      <div className="group-orientation-vertical:flex-col group-orientation-horizontal:gap-4 flex gap-2">
        {props.children}
      </div>
      {props.description && <Description>{props.description}</Description>}
      <FieldError>{props.errorMessage}</FieldError>
    </RACRadioGroup>
  );
}

const styles = tv({
  extend: focusRing,
  base: "w-4.5 h-4.5 shrink-0 box-border rounded-full border bg-background transition-all",
  variants: {
    isSelected: {
      false: "border-muted-foreground group-pressed:border-foreground",
      true: "border-[calc(var(--spacing)*1.5)] border-primary group-pressed:border-primary/80 forced-colors:border-[Highlight]!",
    },
    isInvalid: {
      true: "border-destructive group-pressed:border-destructive/80 forced-colors:border-[Mark]!",
    },
    isDisabled: {
      true: "border-border forced-colors:border-[GrayText]!",
    },
  },
});

export interface RadioProps extends RadioFieldProps {
  description?: string;
}

/**
 * A radio button for use inside a `RadioGroup`, with an optional description below it.
 */
export function Radio(props: RadioProps) {
  return (
    <RadioField {...props} className="group flex flex-col gap-1">
      <RadioButton
        className={composeTailwindRenderProps(
          props.className,
          "group text-foreground disabled:text-muted-foreground/50 relative flex items-center gap-2 text-sm transition [-webkit-tap-highlight-color:transparent] forced-colors:disabled:text-[GrayText]",
        )}
      >
        {composeRenderProps(props.children, (children, renderProps) => (
          <>
            <div className={styles(renderProps)} />
            {children}
          </>
        ))}
      </RadioButton>
      {props.description && (
        <Description className="ms-6.5">{props.description}</Description>
      )}
    </RadioField>
  );
}
