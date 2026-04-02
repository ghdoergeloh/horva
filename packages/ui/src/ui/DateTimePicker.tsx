"use client";

import type {
  DatePickerProps as AriaDatePickerProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import { CalendarIcon } from "lucide-react";
import { DatePicker as AriaDatePicker } from "react-aria-components";

import { composeTailwindRenderProps } from "@repo/ui";

import { Calendar } from "./Calendar";
import { DateInput } from "./DateField";
import { Description, FieldError, FieldGroup, Label } from "./Field";
import { FieldButton } from "./FieldButton";
import { Popover } from "./Popover";

export interface DateTimePickerProps<
  T extends DateValue,
> extends AriaDatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DateTimePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  ...props
}: DateTimePickerProps<T>) {
  return (
    <AriaDatePicker
      {...props}
      granularity="minute"
      className={composeTailwindRenderProps(
        props.className,
        "group flex flex-col gap-1 font-sans",
      )}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup className="w-auto cursor-text disabled:cursor-default">
        <DateInput className="flex-1 px-3 text-sm" />
        <FieldButton className="mr-1 w-6 outline-offset-0">
          <CalendarIcon aria-hidden className="h-4 w-4" />
        </FieldButton>
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="p-2">
        <Calendar />
      </Popover>
    </AriaDatePicker>
  );
}
