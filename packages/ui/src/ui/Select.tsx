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
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@repo/ui";

import type { DropdownSectionProps } from "./ListBox";
import { Description, FieldError, Label } from "./Field";
import { DropdownItem, DropdownSection } from "./ListBox";
import { Popover } from "./Popover";

const styles = tv({
  extend: focusRing,
  base: "flex items-center text-start gap-4 w-full font-sans border border-border cursor-default rounded-lg pl-3 pr-2 h-9 min-w-[180px] transition bg-secondary [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      false:
        "text-secondary-foreground hover:bg-secondary/80 pressed:bg-secondary/60 group-invalid:outline group-invalid:outline-destructive forced-colors:group-invalid:outline-[Mark]",
      true: "border-transparent text-muted-foreground/50 forced-colors:text-[GrayText] bg-muted",
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
        "group relative flex flex-col gap-1 font-sans",
      )}
    >
      {label && <Label>{label}</Label>}
      <Button className={styles}>
        <SelectValue className="flex-1 text-sm">
          {({ selectedText, defaultChildren }) =>
            selectedText || defaultChildren
          }
        </SelectValue>
        <ChevronDown
          aria-hidden
          className="text-muted-foreground group-disabled:text-muted-foreground/50 h-4 w-4 forced-colors:text-[ButtonText] forced-colors:group-disabled:text-[GrayText]"
        />
      </Button>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="min-w-(--trigger-width)">
        <ListBox
          items={items}
          className="box-border max-h-[inherit] overflow-auto p-1 outline-hidden [clip-path:inset(0_0_0_0_round_.75rem)]"
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
