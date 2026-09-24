"use client";

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
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import { CalendarGridHeader, CalendarHeader } from "./Calendar";

export interface RangeCalendarProps<T extends DateValue> extends Omit<
  AriaRangeCalendarProps<T>,
  "visibleDuration"
> {
  errorMessage?: string;
}

const cell = tv({
  extend: focusRing,
  base: "w-full h-full flex items-center justify-center rounded-full forced-color-adjust-none text-foreground",
  variants: {
    selectionState: {
      none: "group-hover:bg-accent group-pressed:bg-muted-foreground/20",
      middle: [
        "group-hover:bg-primary/20 forced-colors:group-hover:bg-[Highlight]",
        "group-invalid:group-hover:bg-destructive/20 forced-colors:group-invalid:group-hover:bg-[Mark]",
        "group-pressed:bg-primary/30 forced-colors:group-pressed:bg-[Highlight] forced-colors:text-[HighlightText]",
        "group-invalid:group-pressed:bg-destructive/30 forced-colors:group-invalid:group-pressed:bg-[Mark]",
      ],
      cap: "bg-primary group-invalid:bg-destructive forced-colors:bg-[Highlight] forced-colors:group-invalid:bg-[Mark] text-primary-foreground forced-colors:text-[HighlightText]",
    },
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
    // Ring stays visible on top of the range fill, so today remains
    // identifiable even when it falls inside the selected range.
    isToday: {
      true: "ring-2 ring-blue-600 ring-inset dark:ring-blue-400 forced-colors:ring-[ButtonBorder]",
    },
  },
});

export function RangeCalendar<T extends DateValue>({
  errorMessage,
  ...props
}: RangeCalendarProps<T>) {
  return (
    <AriaRangeCalendar
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "@container w-[calc(9*var(--spacing)*7)] max-w-full font-sans",
      )}
    >
      <CalendarHeader />
      <CalendarGrid className="border-spacing-0 [&_td]:px-0 [&_td]:py-px">
        <CalendarGridHeader />
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className="group outside-month:text-muted-foreground/50 selected:bg-primary/10 forced-colors:selected:bg-[Highlight] invalid:selected:bg-destructive/10 forced-colors:invalid:selected:bg-[Mark] selection-start:rounded-s-full selection-end:rounded-e-full aspect-square w-[calc(100cqw/7)] cursor-default text-sm outline outline-0 [-webkit-tap-highlight-color:transparent] [td:first-child_&]:rounded-s-full [td:last-child_&]:rounded-e-full"
            >
              {({
                formattedDate,
                isSelected,
                isSelectionStart,
                isSelectionEnd,
                isFocusVisible,
                isDisabled,
                isToday,
              }) => (
                <span
                  className={cell({
                    selectionState:
                      isSelected && (isSelectionStart || isSelectionEnd)
                        ? "cap"
                        : isSelected
                          ? "middle"
                          : "none",
                    isDisabled,
                    isFocusVisible,
                    isToday,
                  })}
                >
                  {formattedDate}
                </span>
              )}
            </CalendarCell>
          )}
        </CalendarGridBody>
      </CalendarGrid>
      {errorMessage && (
        <Text slot="errorMessage" className="text-destructive text-sm">
          {errorMessage}
        </Text>
      )}
    </AriaRangeCalendar>
  );
}
