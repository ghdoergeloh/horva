"use client";

import type {
  NumberFieldProps as AriaNumberFieldProps,
  ButtonProps,
  ValidationResult,
} from "react-aria-components";
import { ChevronDown, ChevronUp } from "lucide-react";
import { NumberField as AriaNumberField, Button } from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

import {
  Description,
  fieldBorderStyles,
  FieldError,
  FieldGroup,
  Input,
  Label,
} from "./Field";

export interface NumberFieldProps extends AriaNumberFieldProps {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
}

export function NumberField({
  label,
  description,
  errorMessage,
  placeholder,
  ...props
}: NumberFieldProps) {
  return (
    <AriaNumberField
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "group flex flex-col gap-1 font-sans",
      )}
    >
      <Label>{label}</Label>
      <FieldGroup>
        {(renderProps) => (
          <>
            <Input className="w-20" placeholder={placeholder} />
            <div
              className={fieldBorderStyles({
                ...renderProps,
                class: "flex h-full flex-col border-s",
              })}
            >
              <StepperButton slot="increment">
                <ChevronUp aria-hidden className="h-4 w-4" />
              </StepperButton>
              <div
                className={fieldBorderStyles({
                  ...renderProps,
                  class: "border-b",
                })}
              />
              <StepperButton slot="decrement">
                <ChevronDown aria-hidden className="h-4 w-4" />
              </StepperButton>
            </div>
          </>
        )}
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </AriaNumberField>
  );
}

function StepperButton(props: ButtonProps) {
  return (
    <Button
      {...props}
      className="pressed:bg-neutral-100 dark:pressed:bg-neutral-800 box-border flex flex-1 cursor-default border-0 bg-transparent px-0.5 py-0 text-neutral-500 [-webkit-tap-highlight-color:transparent] group-disabled:text-neutral-200 dark:text-neutral-400 dark:group-disabled:text-neutral-600 forced-colors:group-disabled:text-[GrayText]"
    />
  );
}
