"use client";

import type { CalendarDate } from "@internationalized/date";
import type {
  DateRangePickerProps as AriaDateRangePickerProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import { use, useRef } from "react";
import {
  endOfMonth,
  endOfWeek,
  getLocalTimeZone,
  startOfMonth,
  startOfWeek,
  toCalendarDate,
  today,
} from "@internationalized/date";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerStateContext,
  Dialog,
  Button as RACButton,
  RangeCalendarStateContext,
} from "react-aria-components";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import type { DateBounds } from "./DateField";
import { tv } from "../lib/tw";
import { Button } from "./Button";
import { CalendarFooter } from "./Calendar";
import {
  CalendarTriggerButton,
  dateLike,
  DateSegments,
  FieldClearButton,
  FieldDivider,
  focusFirstSegment,
  isDateAllowed,
  WithoutPickerButton,
} from "./DateField";
import { Description, FieldError, FieldGroup, Label } from "./Field";
import { Popover } from "./Popover";
import { RangeCalendar } from "./RangeCalendar";

export interface DateRangePreset {
  id: string;
  label: string;
  range: { start: DateValue; end: DateValue };
}

interface Range<T extends DateValue = DateValue> {
  start: T;
  end: T;
}

/** Labels of the default presets, German by default. */
export interface DateRangePresetLabels {
  today: string;
  yesterday: string;
  thisWeek: string;
  lastWeek: string;
  thisMonth: string;
  lastMonth: string;
  last30Days: string;
}

const germanPresetLabels: DateRangePresetLabels = {
  today: "Heute",
  yesterday: "Gestern",
  thisWeek: "Diese Woche",
  lastWeek: "Letzte Woche",
  thisMonth: "Dieser Monat",
  lastMonth: "Letzter Monat",
  last30Days: "Letzte 30 Tage",
};

/**
 * The default presets relative to `now`. Weeks start on Monday, the last
 * 30 days end with today.
 */
export function defaultDateRangePresets(
  now: CalendarDate = today(getLocalTimeZone()),
  labels: DateRangePresetLabels = germanPresetLabels,
): DateRangePreset[] {
  const week = (day: CalendarDate) => ({
    start: startOfWeek(day, "de-DE", "mon"),
    end: endOfWeek(day, "de-DE", "mon"),
  });
  const month = (day: CalendarDate) => ({
    start: startOfMonth(day),
    end: endOfMonth(day),
  });
  const yesterday = now.subtract({ days: 1 });
  return [
    { id: "today", label: labels.today, range: { start: now, end: now } },
    {
      id: "yesterday",
      label: labels.yesterday,
      range: { start: yesterday, end: yesterday },
    },
    { id: "thisWeek", label: labels.thisWeek, range: week(now) },
    {
      id: "lastWeek",
      label: labels.lastWeek,
      range: week(now.subtract({ weeks: 1 })),
    },
    { id: "thisMonth", label: labels.thisMonth, range: month(now) },
    {
      id: "lastMonth",
      label: labels.lastMonth,
      range: month(now.subtract({ months: 1 })),
    },
    {
      id: "last30Days",
      label: labels.last30Days,
      range: { start: now.subtract({ days: 29 }), end: now },
    },
  ];
}

/** Number of days in the range, both ends included. */
export function rangeDayCount(range: Range): number {
  return toCalendarDate(range.end).compare(toCalendarDate(range.start)) + 1;
}

/**
 * The range moved by its own length: whole months move by months (and end
 * on the last day of the month), any other range by its number of days.
 */
export function shiftRange<T extends DateValue>(
  range: Range<T>,
  direction: 1 | -1,
): Range<T> {
  const start = toCalendarDate(range.start);
  const end = toCalendarDate(range.end);
  const wholeMonths = start.day === 1 && end.compare(endOfMonth(end)) === 0;
  if (wholeMonths) {
    const months = (end.year - start.year) * 12 + (end.month - start.month) + 1;
    const newStart = start.add({ months: months * direction });
    const newEnd = endOfMonth(newStart.add({ months: months - 1 }));
    return {
      start: range.start.set({
        year: newStart.year,
        month: newStart.month,
        day: newStart.day,
      }) as T,
      end: range.end.set({
        year: newEnd.year,
        month: newEnd.month,
        day: newEnd.day,
      }) as T,
    };
  }
  const days = rangeDayCount(range) * direction;
  return {
    start: range.start.add({ days }) as T,
    end: range.end.add({ days }) as T,
  };
}

/** Bounds of a range picker; unavailable days may sit inside a range only when non-contiguous ranges are allowed. */
export interface RangeBounds extends DateBounds {
  allowsNonContiguousRanges?: boolean;
}

/** True when both ends, and every day between them, respect the bounds. */
export function isRangeAllowed(range: Range, bounds: RangeBounds): boolean {
  const { isDateUnavailable, ...limits } = bounds;
  if (!isDateAllowed(range.start, limits) || !isDateAllowed(range.end, limits))
    return false;
  if (!isDateUnavailable) return true;
  if (bounds.allowsNonContiguousRanges)
    return !isDateUnavailable(range.start) && !isDateUnavailable(range.end);
  const end = toCalendarDate(range.end);
  for (
    let day = toCalendarDate(range.start);
    day.compare(end) <= 0;
    day = day.add({ days: 1 })
  ) {
    if (isDateUnavailable(day)) return false;
  }
  return true;
}

/**
 * The days of `range` in the type of `value`: dates stay dates, date-times
 * keep the times of the value, or midnight without a value.
 */
export function rangeLike(
  range: Range,
  value:
    | { start?: DateValue | null; end?: DateValue | null }
    | null
    | undefined,
  withTime: boolean,
): Range {
  return {
    start: dateLike(range.start, value?.start, withTime),
    end: dateLike(range.end, value?.end, withTime),
  };
}

const presetStyles = tv({
  extend: focusRing,
  base: "shrink-0 cursor-default border-0 font-sans text-small text-foreground transition-colors [-webkit-tap-highlight-color:transparent] hover:bg-accent pressed:bg-accent",
  variants: {
    layout: {
      list: "h-7.5 rounded-md px-2.5 text-start",
      chips: "h-7.5 rounded-full border border-border px-3",
      auto: "h-7.5 rounded-md px-2.5 text-start max-sm:rounded-full max-sm:border max-sm:border-border max-sm:px-3",
    },
    isActive: {
      true: "bg-accent font-semibold text-accent-foreground",
      false: "bg-transparent",
    },
    isDisabled: {
      true: "opacity-45 hover:bg-transparent",
    },
  },
});

const presetListStyles = tv({
  base: "flex gap-0.5",
  variants: {
    layout: {
      list: "min-w-32 flex-col border-e border-border pe-3 me-3",
      chips:
        "mb-3 max-w-[252px] gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]",
      auto: "min-w-32 flex-col border-e border-border pe-3 me-3 max-sm:mb-3 max-sm:me-0 max-sm:max-w-[252px] max-sm:min-w-0 max-sm:flex-row max-sm:gap-1.5 max-sm:overflow-x-auto max-sm:border-e-0 max-sm:pe-0 max-sm:pb-1",
    },
  },
});

type PresetLayout = "auto" | "list" | "chips";

function PresetItem({
  preset,
  layout,
  bounds,
}: {
  preset: DateRangePreset;
  layout: PresetLayout;
  bounds: RangeBounds;
}) {
  const state = use(DateRangePickerStateContext);
  if (!state) return null;

  const { start, end } = state.value;
  const isActive =
    start != null &&
    end != null &&
    toCalendarDate(preset.range.start).compare(toCalendarDate(start)) === 0 &&
    toCalendarDate(preset.range.end).compare(toCalendarDate(end)) === 0;
  const next = rangeLike(preset.range, state.value, state.hasTime);

  return (
    <RACButton
      className={(renderProps) =>
        presetStyles({ ...renderProps, layout, isActive })
      }
      aria-pressed={isActive}
      isDisabled={!isRangeAllowed(next, bounds)}
      onPress={() => {
        state.setValue(next);
        state.close();
      }}
    >
      {preset.label}
    </RACButton>
  );
}

/** The number of days of the range being picked, below the calendar. */
function DayCount({ format }: { format: (days: number) => string }) {
  const state = use(RangeCalendarStateContext);
  const range = state?.highlightedRange ?? state?.value;
  return (
    <CalendarFooter>
      <span className="text-muted-foreground text-caption font-normal">
        {range ? format(rangeDayCount(range)) : " "}
      </span>
    </CalendarFooter>
  );
}

/** ‹ › next to the field: move the range by its own length. */
function RangeStepper({
  previousLabel,
  nextLabel,
  isDisabled,
  bounds,
}: {
  previousLabel: string;
  nextLabel: string;
  isDisabled: boolean;
  bounds: RangeBounds;
}) {
  const state = use(DateRangePickerStateContext);
  const value = state?.value;
  const range =
    value?.start != null && value.end != null
      ? { start: value.start, end: value.end }
      : null;
  const previous = range && shiftRange(range, -1);
  const next = range && shiftRange(range, 1);
  return (
    <WithoutPickerButton>
      <div className="flex gap-0.5">
        <Button
          variant="quiet"
          aria-label={previousLabel}
          isDisabled={
            isDisabled || !previous || !isRangeAllowed(previous, bounds)
          }
          onPress={() => {
            if (previous) state?.setValue(previous);
          }}
        >
          <ChevronLeft aria-hidden />
        </Button>
        <Button
          variant="quiet"
          aria-label={nextLabel}
          isDisabled={isDisabled || !next || !isRangeAllowed(next, bounds)}
          onPress={() => {
            if (next) state?.setValue(next);
          }}
        >
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </WithoutPickerButton>
  );
}

function RangeField({
  clearLabel,
  calendarLabel,
  isClearable,
  isEditable,
}: {
  clearLabel: string;
  calendarLabel: string;
  isClearable: boolean;
  isEditable: boolean;
}) {
  const state = use(DateRangePickerStateContext);
  const ref = useRef<HTMLDivElement>(null);
  const hasValue = state?.value.start != null || state?.value.end != null;
  return (
    // FieldGroup takes no ref; the wrapper finds the first segment.
    <div ref={ref} className="contents">
      <FieldGroup className="w-auto min-w-0 shrink cursor-text gap-2 ps-2.5 pe-1 disabled:cursor-default">
        <div className="flex min-w-0 flex-1 [scrollbar-width:none] items-center overflow-x-auto">
          <DateSegments slot="start" className="flex-none" />
          <span
            aria-hidden="true"
            className="text-foreground group-disabled:text-muted-foreground px-1.5 forced-colors:text-[ButtonText]"
          >
            –
          </span>
          <DateSegments slot="end" className="flex-none" />
        </div>
        {isClearable && hasValue && isEditable && (
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

export interface DateRangePickerProps<
  T extends DateValue,
> extends AriaDateRangePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /**
   * Ranges shown as shortcuts in the popover. Defaults to
   * `defaultDateRangePresets()`; an empty list hides them.
   */
  presets?: DateRangePreset[];
  /**
   * `list` beside the calendar, `chips` as a row above it, `auto` switches
   * to chips on narrow screens.
   * @default 'auto'
   */
  presetLayout?: PresetLayout;
  /** Shows ‹ › next to the field. @default true */
  showStepper?: boolean;
  /** Accessible name of the × in the field. */
  clearLabel?: string;
  /** Shows the × that removes the range. @default true */
  isClearable?: boolean;
  /** Accessible name of the calendar button. */
  calendarLabel?: string;
  /** Accessible name of ‹. */
  previousRangeLabel?: string;
  /** Accessible name of ›. */
  nextRangeLabel?: string;
  /** Text below the calendar for the number of days. */
  formatDayCount?: (days: number) => string;
}

const germanDayCount = (days: number) =>
  days === 1 ? "1 Tag" : `${String(days)} Tage`;

/**
 * A range of days: two dates in one field, presets and a calendar in the
 * popover, ‹ › to move by the length of the range and × to remove it.
 */
export function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  presets,
  presetLayout = "auto",
  showStepper = true,
  clearLabel = "Zeitraum entfernen",
  isClearable = true,
  calendarLabel = "Kalender öffnen",
  previousRangeLabel = "Vorheriger Zeitraum",
  nextRangeLabel = "Nächster Zeitraum",
  formatDayCount = germanDayCount,
  firstDayOfWeek = "mon",
  shouldForceLeadingZeros = true,
  ...props
}: DateRangePickerProps<T>) {
  const shownPresets = presets ?? defaultDateRangePresets();
  const unavailable = props.isDateUnavailable;
  const bounds: RangeBounds = {
    minValue: props.minValue,
    maxValue: props.maxValue,
    isDateUnavailable: unavailable && ((date) => unavailable(date, null)),
    allowsNonContiguousRanges: props.allowsNonContiguousRanges,
  };
  return (
    <AriaDateRangePicker
      {...props}
      shouldForceLeadingZeros={shouldForceLeadingZeros}
      firstDayOfWeek={firstDayOfWeek}
      className={composeTailwindRenderProps(
        props.className,
        "group flex max-w-full flex-col gap-1.5 font-sans",
      )}
    >
      {({ isDisabled, isReadOnly }) => (
        <>
          {label && <Label>{label}</Label>}
          <div className="flex items-center gap-2">
            <RangeField
              clearLabel={clearLabel}
              calendarLabel={calendarLabel}
              isClearable={isClearable}
              isEditable={!isDisabled && !isReadOnly}
            />
            {showStepper && (
              <RangeStepper
                previousLabel={previousRangeLabel}
                nextLabel={nextRangeLabel}
                isDisabled={isDisabled || isReadOnly}
                bounds={bounds}
              />
            )}
          </div>
          {description && <Description>{description}</Description>}
          <FieldError>{errorMessage}</FieldError>
          <Popover className="max-w-[calc(100vw-1rem)] p-3">
            <Dialog
              className={
                presetLayout === "chips"
                  ? "flex flex-col outline-0"
                  : presetLayout === "list"
                    ? "flex outline-0"
                    : "flex outline-0 max-sm:flex-col"
              }
            >
              {shownPresets.length > 0 && (
                <div className={presetListStyles({ layout: presetLayout })}>
                  {shownPresets.map((preset) => (
                    <PresetItem
                      key={preset.id}
                      preset={preset}
                      layout={presetLayout}
                      bounds={bounds}
                    />
                  ))}
                </div>
              )}
              <RangeCalendar
                firstDayOfWeek={firstDayOfWeek}
                footer={<DayCount format={formatDayCount} />}
              />
            </Dialog>
          </Popover>
        </>
      )}
    </AriaDateRangePicker>
  );
}
