"use client";

import type {
  DatePickerProps as AriaDatePickerProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import { use, useRef } from "react";
import {
  DatePicker as AriaDatePicker,
  DatePickerStateContext,
  Dialog,
} from "react-aria-components";

import { composeTailwindRenderProps } from "@horva/ui";

import { Button } from "./Button";
import { Calendar, CalendarFooter } from "./Calendar";
import {
  CalendarTriggerButton,
  DateSegments,
  FieldClearButton,
  focusFirstSegment,
  isTodayKey,
  todayLike,
} from "./DateField";
import { Description, FieldError, FieldGroup, Label } from "./Field";
import { Popover } from "./Popover";

export interface DatePickerProps<
  T extends DateValue,
> extends AriaDatePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /** Accessible name of the × in the field. */
  clearLabel?: string;
  /** Accessible name of the calendar button. */
  calendarLabel?: string;
  /** Text of the calendar button that picks today. */
  todayLabel?: string;
  /** Text of the calendar button that picks tomorrow. */
  tomorrowLabel?: string;
  /** Text of the calendar button that removes the date. */
  removeLabel?: string;
}

/** Heute, Morgen and Entfernen below the calendar. */
function QuickChoices({
  todayLabel,
  tomorrowLabel,
  removeLabel,
}: {
  todayLabel: string;
  tomorrowLabel: string;
  removeLabel: string;
}) {
  const state = use(DatePickerStateContext);
  if (!state) return null;
  const pick = (offsetDays: number) => {
    state.setValue(todayLike(state.value, state.hasTime, offsetDays));
    state.close();
  };
  return (
    <CalendarFooter>
      <Button variant="quiet" size="sm" onPress={() => pick(0)}>
        {todayLabel}
      </Button>
      <Button variant="quiet" size="sm" onPress={() => pick(1)}>
        {tomorrowLabel}
      </Button>
      <Button
        variant="quiet"
        size="sm"
        isDisabled={state.value == null}
        onPress={() => {
          state.setValue(null);
          state.close();
        }}
      >
        {removeLabel}
      </Button>
    </CalendarFooter>
  );
}

/** Segments, × and calendar button; reads the state of the picker. */
function PickerField({
  clearLabel,
  calendarLabel,
  isDisabled,
  isReadOnly,
}: {
  clearLabel: string;
  calendarLabel: string;
  isDisabled: boolean;
  isReadOnly: boolean;
}) {
  const state = use(DatePickerStateContext);
  const ref = useRef<HTMLDivElement>(null);
  const isEditable = !isDisabled && !isReadOnly;

  return (
    // FieldGroup takes no ref; the wrapper finds the first segment.
    <div ref={ref} className="contents">
      <FieldGroup
        onKeyDownCapture={(event) => {
          if (!state || !isEditable || !isTodayKey(event)) return;
          event.preventDefault();
          event.stopPropagation();
          state.setValue(todayLike(state.value, state.hasTime));
        }}
        className="w-auto min-w-[208px] cursor-text gap-2 ps-2.5 pe-1 disabled:cursor-default"
      >
        <DateSegments />
        {state?.value != null && isEditable && (
          <FieldClearButton
            aria-label={clearLabel}
            onPress={() => {
              focusFirstSegment(ref.current);
              state.setValue(null);
            }}
          />
        )}
        <CalendarTriggerButton aria-label={calendarLabel} />
      </FieldGroup>
    </div>
  );
}

/**
 * A date typed in segments or picked in a calendar. `Alt+↓` opens the
 * calendar, Escape closes it and returns to the field, `T` sets today and
 * the × removes the date without opening the calendar.
 */
export function DatePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  clearLabel = "Datum entfernen",
  calendarLabel = "Kalender öffnen",
  todayLabel = "Heute",
  tomorrowLabel = "Morgen",
  removeLabel = "Entfernen",
  firstDayOfWeek = "mon",
  shouldForceLeadingZeros = true,
  ...props
}: DatePickerProps<T>) {
  return (
    <AriaDatePicker
      {...props}
      shouldForceLeadingZeros={shouldForceLeadingZeros}
      firstDayOfWeek={firstDayOfWeek}
      className={composeTailwindRenderProps(
        props.className,
        "group flex flex-col gap-1.5 font-sans",
      )}
    >
      {({ isDisabled, isReadOnly }) => (
        <>
          {label && <Label>{label}</Label>}
          <PickerField
            clearLabel={clearLabel}
            calendarLabel={calendarLabel}
            isDisabled={isDisabled}
            isReadOnly={isReadOnly}
          />
          {description && <Description>{description}</Description>}
          <FieldError>{errorMessage}</FieldError>
          <Popover className="p-3">
            <Dialog className="outline-0">
              <Calendar firstDayOfWeek={firstDayOfWeek} />
              <QuickChoices
                todayLabel={todayLabel}
                tomorrowLabel={tomorrowLabel}
                removeLabel={removeLabel}
              />
            </Dialog>
          </Popover>
        </>
      )}
    </AriaDatePicker>
  );
}
