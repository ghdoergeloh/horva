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

import type { DateBounds } from "./DateField";
import { Button } from "./Button";
import { Calendar, CalendarFooter } from "./Calendar";
import {
  CalendarTriggerButton,
  DateSegments,
  FieldClearButton,
  FieldDivider,
  focusFirstSegment,
  isDateAllowed,
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
  /** Shows the × in the field and Entfernen below the calendar. @default true */
  isClearable?: boolean;
}

/** Heute, Morgen and Entfernen below the calendar. */
function QuickChoices({
  todayLabel,
  tomorrowLabel,
  removeLabel,
  isClearable,
  bounds,
}: {
  todayLabel: string;
  tomorrowLabel: string;
  removeLabel: string;
  isClearable: boolean;
  bounds: DateBounds;
}) {
  const state = use(DatePickerStateContext);
  if (!state) return null;
  const choice = (label: string, offsetDays: number) => {
    const next = todayLike(state.value, state.hasTime, offsetDays);
    return (
      <Button
        variant="quiet"
        size="sm"
        isDisabled={!isDateAllowed(next, bounds)}
        onPress={() => {
          state.setValue(next);
          state.close();
        }}
      >
        {label}
      </Button>
    );
  };
  return (
    <CalendarFooter>
      {choice(todayLabel, 0)}
      {choice(tomorrowLabel, 1)}
      {isClearable && (
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
      )}
    </CalendarFooter>
  );
}

/** Segments, × and calendar button; reads the state of the picker. */
function PickerField({
  clearLabel,
  calendarLabel,
  isClearable,
  bounds,
  isDisabled,
  isReadOnly,
}: {
  clearLabel: string;
  calendarLabel: string;
  isClearable: boolean;
  bounds: DateBounds;
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
          const next = todayLike(state.value, state.hasTime);
          if (isDateAllowed(next, bounds)) state.setValue(next);
        }}
        className="w-auto min-w-[208px] cursor-text gap-2 ps-2.5 pe-1 disabled:cursor-default"
      >
        <DateSegments />
        {isClearable && state?.value != null && isEditable && (
          <>
            <FieldClearButton
              aria-label={clearLabel}
              onPress={() => {
                focusFirstSegment(ref.current);
                state.setValue(null);
              }}
            />
            <FieldDivider />
          </>
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
  isClearable = true,
  firstDayOfWeek = "mon",
  shouldForceLeadingZeros = true,
  ...props
}: DatePickerProps<T>) {
  const bounds: DateBounds = {
    minValue: props.minValue,
    maxValue: props.maxValue,
    isDateUnavailable: props.isDateUnavailable,
  };
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
            isClearable={isClearable}
            bounds={bounds}
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
                isClearable={isClearable}
                bounds={bounds}
              />
            </Dialog>
          </Popover>
        </>
      )}
    </AriaDatePicker>
  );
}
