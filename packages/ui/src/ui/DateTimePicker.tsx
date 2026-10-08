"use client";

import type { DateValue } from "react-aria-components";

import type { DatePickerProps } from "./DatePicker";
import { DatePicker } from "./DatePicker";

export type DateTimePickerProps<T extends DateValue> = DatePickerProps<T>;

/**
 * A date with time (DD.MM.YYYY HH:MM). Works like `DatePicker`; the quick
 * choices keep the time of the current value.
 */
export function DateTimePicker<T extends DateValue>(
  props: DateTimePickerProps<T>,
) {
  return <DatePicker {...props} granularity="minute" />;
}
