"use client";

import type { ReactNode } from "react";
import type {
  RangeCalendarProps as AriaRangeCalendarProps,
  DateValue,
} from "react-aria-components";
import {
  RangeCalendar as AriaRangeCalendar,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  Text,
} from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

import { twMerge } from "../lib/tw";
import { CalendarGridHeader, CalendarHeader, dayStyles } from "./Calendar";

export interface RangeCalendarProps<T extends DateValue> extends Omit<
  AriaRangeCalendarProps<T>,
  "visibleDuration"
> {
  errorMessage?: string;
  /** Content below the grid, such as the number of days. */
  footer?: ReactNode;
}

/**
 * A month calendar for a range: the first click sets the start, the second
 * the end. Start and end are `primary`, the days between `accent`.
 */
export function RangeCalendar<T extends DateValue>({
  errorMessage,
  footer,
  firstDayOfWeek = "mon",
  ...props
}: RangeCalendarProps<T>) {
  return (
    <AriaRangeCalendar
      {...props}
      firstDayOfWeek={firstDayOfWeek}
      className={composeTailwindRenderProps(
        props.className,
        "flex w-max max-w-full flex-col font-sans",
      )}
    >
      <CalendarHeader />
      <CalendarGrid
        weekdayStyle="short"
        className="border-separate border-spacing-x-0 border-spacing-y-0.5 [&_td]:p-0"
      >
        <CalendarGridHeader />
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={({
                isSelected,
                isSelectionStart,
                isSelectionEnd,
                isToday,
                isOutsideMonth,
                isDisabled,
                isUnavailable,
                isInvalid,
                isFocusVisible,
              }) => {
                const isCap =
                  isSelected && (isSelectionStart || isSelectionEnd);
                return twMerge(
                  dayStyles({
                    state: isCap ? "selected" : isSelected ? "middle" : "none",
                    isToday,
                    isOutsideMonth,
                    isDisabled:
                      (isDisabled && !isOutsideMonth) || isUnavailable,
                    isInvalid,
                    isFocusVisible,
                  }),
                  isCap &&
                    !(isSelectionStart && isSelectionEnd) &&
                    (isSelectionStart ? "rounded-e-none" : "rounded-s-none"),
                );
              }}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
      {errorMessage && (
        <Text slot="errorMessage" className="text-destructive text-caption">
          {errorMessage}
        </Text>
      )}
      {footer}
    </AriaRangeCalendar>
  );
}
