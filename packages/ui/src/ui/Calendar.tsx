"use client";

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
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import { Button } from "./Button";

const cellStyles = tv({
  extend: focusRing,
  base: "w-[calc(100cqw/7)] aspect-square text-sm cursor-default rounded-full flex items-center justify-center forced-color-adjust-none [-webkit-tap-highlight-color:transparent]",
  variants: {
    isSelected: {
      false: "text-foreground hover:bg-accent pressed:bg-muted-foreground/20",
      true: "bg-primary invalid:bg-destructive text-primary-foreground forced-colors:bg-[Highlight] forced-colors:invalid:bg-[Mark] forced-colors:text-[HighlightText]",
    },
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
    // Ring stays visible on top of the selected fill, so today remains
    // identifiable even when another date is selected.
    isToday: {
      true: "ring-2 ring-blue-600 ring-inset dark:ring-blue-400 forced-colors:ring-[ButtonBorder]",
    },
  },
});

export interface CalendarProps<T extends DateValue> extends Omit<
  AriaCalendarProps<T>,
  "visibleDuration"
> {
  errorMessage?: string;
}

export function Calendar<T extends DateValue>({
  errorMessage,
  ...props
}: CalendarProps<T>) {
  return (
    <AriaCalendar
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "@container flex w-[calc(9*var(--spacing)*7)] max-w-full flex-col font-sans",
      )}
    >
      <CalendarHeader />
      <CalendarGrid className="border-spacing-0">
        <CalendarGridHeader />
        <CalendarGridBody>
          {(date) => (
            <CalendarCell
              date={date}
              className={(renderProps) => cellStyles(renderProps)}
            />
          )}
        </CalendarGridBody>
      </CalendarGrid>
      {errorMessage && (
        <Text slot="errorMessage" className="text-destructive text-sm">
          {errorMessage}
        </Text>
      )}
    </AriaCalendar>
  );
}

export function CalendarHeader() {
  const { direction } = useLocale();

  return (
    <header className="border-box flex items-center gap-1 px-1 pb-4">
      <Button variant="quiet" slot="previous">
        {direction === "rtl" ? (
          <ChevronRight aria-hidden size={18} />
        ) : (
          <ChevronLeft aria-hidden size={18} />
        )}
      </Button>
      <Heading className="text-foreground mx-2 my-0 flex-1 text-center font-sans text-base font-semibold [font-variation-settings:normal]" />
      <Button variant="quiet" slot="next">
        {direction === "rtl" ? (
          <ChevronLeft aria-hidden size={18} />
        ) : (
          <ChevronRight aria-hidden size={18} />
        )}
      </Button>
    </header>
  );
}

export function CalendarGridHeader() {
  return (
    <AriaCalendarGridHeader>
      {(day) => (
        <CalendarHeaderCell className="text-muted-foreground text-xs font-semibold">
          {day}
        </CalendarHeaderCell>
      )}
    </AriaCalendarGridHeader>
  );
}
