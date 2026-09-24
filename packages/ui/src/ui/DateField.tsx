"use client";

import type {
  DateFieldProps as AriaDateFieldProps,
  DateInputProps as AriaDateInputProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  DateSegment,
  useLocale,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps } from "@horva/ui";

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
  const { locale: ariaLocale } = useLocale();
  console.log("locale", ariaLocale);
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
  base: "inline p-0.5 whitespace-nowrap type-literal:p-0 rounded-xs outline outline-0 forced-color-adjust-none caret-transparent text-foreground forced-colors:text-[ButtonText] [-webkit-tap-highlight-color:transparent]",
  variants: {
    isPlaceholder: {
      true: "text-muted-foreground",
    },
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
    isFocused: {
      true: "bg-primary text-primary-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
  },
});

interface DateInputProps extends Omit<AriaDateInputProps, "children"> {
  minWidth?: "none" | "small" | "medium";
}

export function DateInput({ minWidth = "medium", ...props }: DateInputProps) {
  return (
    <AriaDateInput
      className={(renderProps) =>
        fieldGroupStyles({
          ...renderProps,
          minWidth,
          class:
            "inline h-9 cursor-text overflow-x-auto px-3 font-sans text-sm leading-8.5 whitespace-nowrap [scrollbar-width:none] disabled:cursor-default",
        })
      }
      {...props}
    >
      {(segment) => <DateSegment segment={segment} className={segmentStyles} />}
    </AriaDateInput>
  );
}
