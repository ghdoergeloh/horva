"use client";

import type {
  DateRangePickerProps as AriaDateRangePickerProps,
  DateValue,
  ValidationResult,
} from "react-aria-components";
import { useContext } from "react";
import { CalendarIcon } from "lucide-react";
import {
  DateRangePicker as AriaDateRangePicker,
  DateRangePickerStateContext,
  Button as RACButton,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import { DateInput } from "./DateField";
import { Description, FieldError, FieldGroup, Label } from "./Field";
import { FieldButton } from "./FieldButton";
import { Popover } from "./Popover";
import { RangeCalendar } from "./RangeCalendar";

export interface DateRangePreset {
  id: string;
  label: string;
  range: { start: DateValue; end: DateValue };
}

export interface DateRangePickerProps<
  T extends DateValue,
> extends AriaDateRangePickerProps<T> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  /** Predefined ranges shown as a shortcut list inside the popover. */
  presets?: DateRangePreset[];
}

const presetButton = tv({
  extend: focusRing,
  base: "w-full rounded-lg px-3 py-1.5 text-left text-sm text-neutral-800 transition [-webkit-tap-highlight-color:transparent] dark:text-neutral-200",
  variants: {
    isActive: {
      true: "bg-blue-600 text-white",
      false:
        "hover:bg-neutral-200 pressed:bg-neutral-300 dark:hover:bg-neutral-700 dark:pressed:bg-neutral-600",
    },
  },
});

function PresetItem({ preset }: { preset: DateRangePreset }) {
  const state = useContext(DateRangePickerStateContext);
  if (!state) return null;

  const { start, end } = state.value;
  const isActive =
    start !== null &&
    end !== null &&
    preset.range.start.compare(start) === 0 &&
    preset.range.end.compare(end) === 0;

  return (
    <RACButton
      className={(renderProps) => presetButton({ ...renderProps, isActive })}
      onPress={() => {
        state.setValue(preset.range);
        state.close();
      }}
    >
      {preset.label}
    </RACButton>
  );
}

export function DateRangePicker<T extends DateValue>({
  label,
  description,
  errorMessage,
  presets,
  ...props
}: DateRangePickerProps<T>) {
  return (
    <AriaDateRangePicker
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "group flex max-w-full flex-col gap-1 font-sans",
      )}
    >
      {label && <Label>{label}</Label>}
      <FieldGroup className="w-auto min-w-[208px] cursor-text disabled:cursor-default">
        <div className="flex w-fit flex-1 items-center overflow-x-auto overflow-y-clip [scrollbar-width:none]">
          <DateInput slot="start" className="ps-3 pe-2 text-sm" />
          <span
            aria-hidden="true"
            className="text-neutral-800 group-disabled:text-neutral-200 dark:text-neutral-200 dark:group-disabled:text-neutral-600 forced-colors:text-[ButtonText] forced-colors:group-disabled:text-[GrayText]"
          >
            –
          </span>
          <DateInput slot="end" className="flex-1 ps-2 pe-3 text-sm" />
        </div>
        <FieldButton className="mr-1 w-6 outline-offset-0">
          <CalendarIcon aria-hidden className="h-4 w-4" />
        </FieldButton>
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="p-2">
        {presets && presets.length > 0 ? (
          <div className="flex items-start gap-2">
            <div className="flex min-w-32 flex-col gap-0.5 self-stretch border-e border-black/10 pe-2 dark:border-white/10">
              {presets.map((preset) => (
                <PresetItem key={preset.id} preset={preset} />
              ))}
            </div>
            <RangeCalendar />
          </div>
        ) : (
          <RangeCalendar />
        )}
      </Popover>
    </AriaDateRangePicker>
  );
}
