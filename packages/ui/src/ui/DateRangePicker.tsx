"use client";

import type {
  DateRangePickerProps as AriaDateRangePickerProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import { CalendarIcon } from "lucide-react";
import { DateRangePicker as AriaDateRangePicker } from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

import { DateInput } from "./DateField";
import { Description, FieldError, FieldGroup, Label } from "./Field";
import { FieldButton } from "./FieldButton";
import { Popover } from "./Popover";
import { RangeCalendar } from "./RangeCalendar";

export interface DateRangePickerProps<
  T extends DateValue,
> extends AriaDateRangePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

export function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  ...props
}: DateRangePickerProps<T>) {
  return (
    <AriaDateRangePicker
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "group flex max-w-full flex-col gap-1 font-sans",
      )}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup className="w-auto min-w-[208px] cursor-text disabled:cursor-default">
        <div className="flex w-fit flex-1 items-center overflow-x-auto overflow-y-clip [scrollbar-width:none]">
          <DateInput slot="start" className="ps-3 pe-2 text-sm" />
          <span
            aria-hidden="true"
            className="text-neutral-800 group-disabled:text-neutral-200 dark:text-neutral-200 dark:group-disabled:text-neutral-600 forced-colors:text-[ButtonText] forced-colors:group-disabled:text-[GrayText]"
          >
            –
          </span>
          <DateInput slot="end" className="flex-1 ps-2 pe-3 text-sm" />
        </div>
        <FieldButton className="mr-1 w-6 outline-offset-0">
          <CalendarIcon aria-hidden className="h-4 w-4" />
        </FieldButton>
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="p-2">
        <RangeCalendar />
      </Popover>
    </AriaDateRangePicker>
  );
}
