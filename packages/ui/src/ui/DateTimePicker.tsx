"use client";

import type {
  DatePickerProps as AriaDatePickerProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import { use } from "react";
import {
  CalendarDateTime,
  getLocalTimeZone,
  now,
  toCalendarDateTime,
  today,
  ZonedDateTime,
} from "@internationalized/date";
import { CalendarIcon, Sun, Trash2 } from "lucide-react";
import {
  DatePicker as AriaDatePicker,
  DatePickerStateContext,
} from "react-aria-components";

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

function CalendarActions() {
  const state = use(DatePickerStateContext);

  function handleToday() {
    if (!state) return;
    const ref = state.value;
    const tz = getLocalTimeZone();
    let val: DateValue;
    if (ref instanceof ZonedDateTime) {
      val = now(tz);
    } else if (ref instanceof CalendarDateTime) {
      val = toCalendarDateTime(now(tz));
    } else {
      val = today(tz);
    }
    state.setValue(val);
    state.close();
  }

  function handleClear() {
    if (!state) return;
    state.setValue(null);
    state.close();
  }

  return (
    <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 dark:border-neutral-700">
      <FieldButton aria-label="Clear" onPress={handleClear}>
        <Trash2 size={14} strokeWidth={2} />
      </FieldButton>
      <FieldButton aria-label="Today" onPress={handleToday}>
        <Sun size={14} strokeWidth={2} />
      </FieldButton>
    </div>
  );
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
        <CalendarActions />
      </Popover>
    </AriaDatePicker>
  );
}
