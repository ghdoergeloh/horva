"use client";

import type {
  TextFieldProps as AriaTextFieldProps,
  ValidationResult,
} from "react-aria-components";
import { TextField as AriaTextField } from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

import { tv } from "../lib/tw";
import {
  Description,
  fieldBorderStyles,
  FieldError,
  Input,
  Label,
} from "./Field";

const inputStyles = tv({
  base: "border-1 rounded-md min-h-9 font-sans text-body py-0 px-2.5 box-border transition",
  variants: {
    isFocused: fieldBorderStyles.variants.isFocusWithin,
    isInvalid: fieldBorderStyles.variants.isInvalid,
    isDisabled: fieldBorderStyles.variants.isDisabled,
  },
});

export interface TextFieldProps extends AriaTextFieldProps {
  label?: string;
  description?: string;
  placeholder?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function TextField({
  label,
  description,
  errorMessage,
  ...props
}: TextFieldProps) {
  return (
    <AriaTextField
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "flex flex-col gap-1 font-sans",
      )}
    >
      {label && <Label>{label}</Label>}
      <Input className={inputStyles} />
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </AriaTextField>
  );
}
