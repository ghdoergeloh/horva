"use client";

import type { ReactNode } from "react";
import type {
  CalendarProps as AriaCalendarProps,
  DateValue,
} from "react-aria-components";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Calendar as AriaCalendar,
  CalendarGridHeader as AriaCalendarGridHeader,
  CalendarCell,
  CalendarGrid,
  CalendarGridBody,
  CalendarHeaderCell,
  Heading,
  Text,
  useLocale,
} from "react-aria-components";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import { tv } from "../lib/tw";
import { Button } from "./Button";

/**
 * A day in the month grid. Today has a dot in `primary`, the selected day
 * a `primary` fill. Range calendars add the start, end and middle states.
 */
export const dayStyles = tv({
  extend: focusRing,
  base: [
    "relative flex h-8.5 w-9 cursor-default items-center justify-center rounded-md font-mono text-small tabular-nums text-foreground outline-offset-[-2px] forced-color-adjust-none [-webkit-tap-highlight-color:transparent]",
    "after:absolute after:bottom-[5px] after:size-1 after:rounded-full",
  ],
  variants: {
    state: {
      none: "hover:bg-accent pressed:bg-accent",
      selected:
        "bg-primary font-semibold text-primary-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
      middle:
        "rounded-none bg-accent text-accent-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
    isToday: {
      true: "font-bold after:bg-primary",
    },
    isOutsideMonth: {
      true: "text-muted-foreground opacity-55",
    },
    isDisabled: {
      true: "text-muted-foreground opacity-55 forced-colors:text-[GrayText]",
    },
    isInvalid: {
      true: "",
    },
  },
  compoundVariants: [
    { isToday: true, state: "none", class: "text-accent-foreground" },
    {
      isToday: true,
      state: "selected",
      class: "after:bg-primary-foreground",
    },
    {
      isInvalid: true,
      state: "selected",
      class:
        "bg-destructive text-destructive-foreground forced-colors:bg-[Mark]",
    },
  ],
});

export interface CalendarProps<T extends DateValue> extends Omit<
  AriaCalendarProps<T>,
  "visibleDuration"
> {
  errorMessage?: string;
  /** Content below the grid, such as quick choices. */
  footer?: ReactNode;
}

/** A month calendar. Weeks start on Monday unless `firstDayOfWeek` says else. */
export function Calendar<T extends DateValue>({
  errorMessage,
  footer,
  firstDayOfWeek = "mon",
  ...props
}: CalendarProps<T>) {
  return (
    <AriaCalendar
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
                isToday,
                isOutsideMonth,
                isDisabled,
                isUnavailable,
                isInvalid,
                isFocusVisible,
              }) =>
                dayStyles({
                  state: isSelected ? "selected" : "none",
                  isToday,
                  isOutsideMonth,
                  isDisabled: (isDisabled && !isOutsideMonth) || isUnavailable,
                  isInvalid,
                  isFocusVisible,
                })
              }
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
    </AriaCalendar>
  );
}

/** Month name between the buttons for the previous and next month. */
export function CalendarHeader() {
  const { direction } = useLocale();

  return (
    <div className="mb-2 flex items-center justify-between gap-1">
      <Button variant="quiet" size="sm" slot="previous">
        {direction === "rtl" ? (
          <ChevronRight aria-hidden />
        ) : (
          <ChevronLeft aria-hidden />
        )}
      </Button>
      <Heading className="text-foreground text-body m-0 flex-1 text-center font-sans font-semibold" />
      <Button variant="quiet" size="sm" slot="next">
        {direction === "rtl" ? (
          <ChevronLeft aria-hidden />
        ) : (
          <ChevronRight aria-hidden />
        )}
      </Button>
    </div>
  );
}

/** Short weekday names above the grid. */
export function CalendarGridHeader() {
  return (
    <AriaCalendarGridHeader>
      {(day) => (
        <CalendarHeaderCell className="text-muted-foreground text-caption h-6 w-9 p-0 font-medium">
          {day}
        </CalendarHeaderCell>
      )}
    </AriaCalendarGridHeader>
  );
}

/** The line below a calendar with quick choices or a summary. */
export function CalendarFooter({ children }: { children: ReactNode }) {
  return (
    <div className="border-border mt-2 flex items-center justify-between gap-2 border-t pt-2">
      {children}
    </div>
  );
}
