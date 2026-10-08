"use client";

import type { KeyboardEvent, ReactNode } from "react";
import type {
  DateFieldProps as AriaDateFieldProps,
  DateInputProps as AriaDateInputProps,
  ButtonProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import { use, useRef } from "react";
import {
  CalendarDateTime,
  getLocalTimeZone,
  today,
  toCalendarDateTime,
  ZonedDateTime,
} from "@internationalized/date";
import { CalendarIcon, X } from "lucide-react";
import {
  DateField as AriaDateField,
  DateInput as AriaDateInput,
  ButtonContext,
  DateFieldStateContext,
  DateSegment,
  Button as RACButton,
} from "react-aria-components";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import { tv } from "../lib/tw";
import { Description, FieldError, fieldGroupStyles, Label } from "./Field";

const segmentStyles = tv({
  base: "inline rounded-[4px] px-0.5 py-px font-mono tabular-nums whitespace-nowrap type-literal:px-0 type-literal:font-sans outline outline-0 forced-color-adjust-none caret-transparent text-foreground forced-colors:text-[ButtonText] [-webkit-tap-highlight-color:transparent]",
  variants: {
    isPlaceholder: {
      true: "text-muted-foreground",
    },
    isDisabled: {
      true: "forced-colors:text-[GrayText]",
    },
    isFocused: {
      true: "bg-primary text-primary-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
  },
});

/**
 * The typed segments of a date or time (DD.MM.YYYY, HH:MM) without a frame.
 * Pickers place it inside their own field group.
 */
export function DateSegments(props: Omit<AriaDateInputProps, "children">) {
  return (
    <AriaDateInput
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "flex min-w-0 flex-1 cursor-text items-center gap-px overflow-x-auto text-body whitespace-nowrap [scrollbar-width:none]",
      )}
    >
      {(segment) => <DateSegment segment={segment} className={segmentStyles} />}
    </AriaDateInput>
  );
}

interface DateInputProps extends Omit<AriaDateInputProps, "children"> {
  minWidth?: "none" | "small" | "medium";
}

/** The segments inside a field frame, for a field without other controls. */
export function DateInput({ minWidth = "medium", ...props }: DateInputProps) {
  return (
    <AriaDateInput
      className={(renderProps) =>
        fieldGroupStyles({
          ...renderProps,
          minWidth,
          class:
            "flex h-9 cursor-text items-center gap-px overflow-x-auto px-2.5 text-body whitespace-nowrap [scrollbar-width:none] disabled:cursor-default",
        })
      }
      {...props}
    >
      {(segment) => <DateSegment segment={segment} className={segmentStyles} />}
    </AriaDateInput>
  );
}

const fieldIconButton = tv({
  extend: focusRing,
  base: "grid shrink-0 place-items-center border-0 bg-transparent outline-offset-0 cursor-default [-webkit-tap-highlight-color:transparent] forced-colors:text-[ButtonText] disabled:opacity-45",
  variants: {
    kind: {
      clear:
        "size-6 rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground pressed:bg-secondary [&_svg]:size-3.5",
      trigger:
        "size-7 rounded-sm text-foreground hover:bg-accent pressed:bg-accent [&_svg]:size-4",
    },
  },
});

/**
 * Hides the button context of a surrounding picker, so a button inside it
 * does not become the picker's trigger.
 */
export function WithoutPickerButton({ children }: { children: ReactNode }) {
  return (
    <ButtonContext.Provider value={null}>{children}</ButtonContext.Provider>
  );
}

/** The × inside a field that removes the value. */
export function FieldClearButton(
  props: Omit<ButtonProps, "children" | "className">,
) {
  return (
    <WithoutPickerButton>
      <RACButton
        {...props}
        className={(renderProps) =>
          fieldIconButton({ ...renderProps, kind: "clear" })
        }
      >
        <X aria-hidden strokeWidth={2} />
      </RACButton>
    </WithoutPickerButton>
  );
}

/** The calendar button at the end of a picker field, after a divider. */
export function CalendarTriggerButton(
  props: Omit<ButtonProps, "children" | "className">,
) {
  return (
    <>
      <span aria-hidden className="bg-border h-5 w-px shrink-0" />
      <RACButton
        {...props}
        className={(renderProps) =>
          fieldIconButton({ ...renderProps, kind: "trigger" })
        }
      >
        <CalendarIcon aria-hidden strokeWidth={2} />
      </RACButton>
    </>
  );
}

/**
 * The given calendar day in the type of `value`: a date stays a date, a
 * date with time keeps its time. Without a value, `withTime` decides.
 */
export function dateLike(
  day: { year: number; month: number; day: number },
  value: DateValue | null | undefined,
  withTime: boolean,
): DateValue {
  const date = { year: day.year, month: day.month, day: day.day };
  if (value instanceof ZonedDateTime || value instanceof CalendarDateTime)
    return value.set(date);
  const plain = today(getLocalTimeZone()).set(date);
  return withTime ? toCalendarDateTime(plain) : plain;
}

/** Today in the type of `value`, see `dateLike`. */
export function todayLike(
  value: DateValue | null | undefined,
  withTime: boolean,
  offsetDays = 0,
): DateValue {
  const day = today(getLocalTimeZone()).add({ days: offsetDays });
  return dateLike(day, value, withTime);
}

/** True when a key press on a date segment should set today. */
export function isTodayKey(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement;
  return (
    (event.key === "t" || event.key === "T") &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    target.getAttribute("role") === "spinbutton"
  );
}

/** Moves focus to the first segment inside `container`. */
export function focusFirstSegment(container: HTMLElement | null) {
  container
    ?.querySelector<HTMLElement>("[role=spinbutton]:not([aria-readonly])")
    ?.focus();
}

export interface DateFieldProps<
  T extends DateValue,
> extends AriaDateFieldProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /** Accessible name of the × that removes the date. */
  clearLabel?: string;
}

/** The frame with segments and ×; reads the state of the date field. */
function DateFieldControl({
  clearLabel,
  isInvalid,
  isDisabled,
  isReadOnly,
}: {
  clearLabel: string;
  isInvalid: boolean;
  isDisabled: boolean;
  isReadOnly: boolean;
}) {
  const state = use(DateFieldStateContext);
  const ref = useRef<HTMLDivElement>(null);
  const hasValue = state?.value != null;

  return (
    <div
      ref={ref}
      onKeyDownCapture={(event) => {
        if (!state || isReadOnly || isDisabled || !isTodayKey(event)) return;
        event.preventDefault();
        event.stopPropagation();
        state.setValue(todayLike(state.value, state.granularity !== "day"));
      }}
      className={fieldGroupStyles({
        isInvalid,
        isDisabled,
        isFocusWithin: false,
        minWidth: "medium",
        class:
          "focus-within:outline-ring gap-2 ps-2.5 pe-1 focus-within:outline-2 focus-within:outline-offset-1 forced-colors:focus-within:outline-[Highlight]",
      })}
    >
      <DateSegments />
      {hasValue && !isDisabled && !isReadOnly && (
        <FieldClearButton
          aria-label={clearLabel}
          onPress={() => {
            focusFirstSegment(ref.current);
            state.setValue(null);
          }}
        />
      )}
    </div>
  );
}

/** A date typed in segments, with an × that removes it. `T` sets today. */
export function DateField<T extends DateValue>({
  label,
  description,
  errorMessage,
  clearLabel = "Datum entfernen",
  shouldForceLeadingZeros = true,
  ...props
}: DateFieldProps<T>) {
  return (
    <AriaDateField
      {...props}
      shouldForceLeadingZeros={shouldForceLeadingZeros}
      className={composeTailwindRenderProps(
        props.className,
        "flex flex-col gap-1.5 font-sans",
      )}
    >
      {({ isInvalid, isDisabled, isReadOnly }) => (
        <>
          {label && <Label>{label}</Label>}
          <DateFieldControl
            clearLabel={clearLabel}
            isInvalid={isInvalid}
            isDisabled={isDisabled}
            isReadOnly={isReadOnly}
          />
          {description && <Description>{description}</Description>}
          <FieldError>{errorMessage}</FieldError>
        </>
      )}
    </AriaDateField>
  );
}
