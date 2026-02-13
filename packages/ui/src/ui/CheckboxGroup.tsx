"use client";

import type { ReactNode } from "react";
import type {
  CheckboxGroupProps as AriaCheckboxGroupProps,
  ValidationResult,
} from "react-aria-components";
import { CheckboxGroup as AriaCheckboxGroup } from "react-aria-components";
import { composeTailwindRenderProps } from "src/lib/react-aria-utils";
import { Description, FieldError, Label } from "src/ui/Field";

export interface CheckboxGroupProps extends Omit<
  AriaCheckboxGroupProps,
  "children"
> {
  label?: string;
  children?: ReactNode;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function CheckboxGroup(props: CheckboxGroupProps) {
  return (
    <AriaCheckboxGroup
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "flex flex-col gap-2 font-sans",
      )}
    >
      <Label>{props.label}</Label>
      {props.children}
      {props.description && <Description>{props.description}</Description>}
      <FieldError>{props.errorMessage}</FieldError>
    </AriaCheckboxGroup>
  );
}
