"use client";

import type React from "react";
import type {
  SelectProps as AriaSelectProps,
  ListBoxItemProps,
  ValidationResult,
} from "react-aria-components";
import { ChevronDown } from "lucide-react";
import {
  Select as AriaSelect,
  Button,
  ListBox,
  SelectValue,
} from "react-aria-components";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import type { DropdownSectionProps } from "./ListBox";
import { tv } from "../lib/tw";
import { Description, FieldError, Label } from "./Field";
import { DropdownItem, DropdownSection } from "./ListBox";
import { Popover } from "./Popover";

const styles = tv({
  extend: focusRing,
  base: "flex items-center text-start gap-2 w-full font-sans border border-input-border cursor-default rounded-md pl-2.5 pr-2 h-9 min-w-0 transition bg-input text-foreground [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      false:
        "hover:bg-accent pressed:bg-accent group-invalid:border-destructive forced-colors:group-invalid:border-[Mark]",
      true: "opacity-45 forced-colors:text-[GrayText]",
    },
  },
});

export interface SelectProps<T extends object> extends Omit<
  AriaSelectProps<T>,
  "children"
> {
  label?: string;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
  items?: Iterable<T>;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

export function Select<T extends object>({
  label,
  description,
  errorMessage,
  children,
  items,
  ...props
}: SelectProps<T>) {
  return (
    <AriaSelect
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        // The minimum width sits here, so `className` can change it.
        "group relative flex min-w-[180px] flex-col gap-1 font-sans",
      )}
    >
      {label && <Label>{label}</Label>}
      <Button className={styles}>
        <SelectValue className="data-placeholder:text-muted-foreground text-body flex flex-1 items-center gap-2 truncate">
          {({ selectedText, defaultChildren }) =>
            selectedText || defaultChildren
          }
        </SelectValue>
        <ChevronDown
          aria-hidden
          className="text-muted-foreground h-4 w-4 shrink-0 forced-colors:text-[ButtonText] forced-colors:group-disabled:text-[GrayText]"
        />
      </Button>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="min-w-(--trigger-width)">
        <ListBox
          items={items}
          className="box-border max-h-[inherit] overflow-auto p-1 outline-hidden [clip-path:inset(0_0_0_0_round_12px)]"
        >
          {children}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}

export function SelectItem(props: ListBoxItemProps) {
  return <DropdownItem {...props} />;
}

export function SelectSection<T extends object>(
  props: DropdownSectionProps<T>,
) {
  return <DropdownSection {...props} />;
}
