"use client";

import type {
  DateFieldProps as AriaDateFieldProps,
  DateInputProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps } from "@repo/ui";

import { Description, FieldError, fieldGroupStyles, Label } from "./Field";

export interface DateFieldProps<
  T extends DateValue,
> extends AriaDateFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DateField<T extends DateValue>({
  label,
  description,
  errorMessage,
  ...props
}: DateFieldProps<T>) {
  return (
    <AriaDateField
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "flex flex-col gap-1",
      )}
    >
      {label && <Label>{label}</Label>}
      <DateInput />
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
    </AriaDateField>
  );
}

const segmentStyles = tv({
  base: "inline p-0.5 whitespace-nowrap type-literal:p-0 rounded-xs outline outline-0 forced-color-adjust-none caret-transparent text-neutral-800 dark:text-neutral-200 forced-colors:text-[ButtonText] [-webkit-tap-highlight-color:transparent]",
  variants: {
    isPlaceholder: {
      true: "text-neutral-600 dark:text-neutral-400",
    },
    isDisabled: {
      true: "text-neutral-200 dark:text-neutral-600 forced-colors:text-[GrayText]",
    },
    isFocused: {
      true: "bg-blue-600 text-white dark:text-white forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
  },
});

export function DateInput(props: Omit<DateInputProps, "children">) {
  return (
    <AriaDateInput
      className={(renderProps) =>
        fieldGroupStyles({
          ...renderProps,
          class:
            "inline h-9 min-w-[150px] cursor-text overflow-x-auto px-3 font-sans text-sm leading-8.5 whitespace-nowrap [scrollbar-width:none] disabled:cursor-default",
        })
      }
      {...props}
    >
      {(segment) => <DateSegment segment={segment} className={segmentStyles} />}
    </AriaDateInput>
  );
}
