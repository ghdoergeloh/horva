"use client";

import type React from "react";
import type {
  ComboBoxProps as AriaComboBoxProps,
  ListBoxItemProps,
  ValidationResult,
} from "react-aria-components";
import type { DropdownSectionProps } from "src/ui/ListBox";
import { ChevronDown } from "lucide-react";
import { ComboBox as AriaComboBox, ListBox } from "react-aria-components";
import { composeTailwindRenderProps } from "src/lib/react-aria-utils";
import {
  Description,
  FieldError,
  FieldGroup,
  Input,
  Label,
} from "src/ui/Field";
import { FieldButton } from "src/ui/FieldButton";
import { DropdownItem, DropdownSection } from "src/ui/ListBox";
import { Popover } from "src/ui/Popover";

export interface ComboBoxProps<T extends object> extends Omit<
  AriaComboBoxProps<T>,
  "children"
> {
  label?: string;
  description?: string | null;
  errorMessage?: string | ((validation: ValidationResult) => string);
  placeholder?: string;
  children: React.ReactNode | ((item: T) => React.ReactNode);
}

export function ComboBox<T extends object>({
  label,
  description,
  errorMessage,
  children,
  items,
  ...props
}: ComboBoxProps<T>) {
  return (
    <AriaComboBox
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "group flex flex-col gap-1 font-sans",
      )}
    >
      <Label>{label}</Label>
      <FieldGroup>
        <Input className="ps-3 pe-1" />
        <FieldButton className="mr-1 w-6 outline-offset-0">
          <ChevronDown aria-hidden className="h-4 w-4" />
        </FieldButton>
      </FieldGroup>
      {description && <Description>{description}</Description>}
      <FieldError>{errorMessage}</FieldError>
      <Popover className="w-(--trigger-width)">
        <ListBox
          items={items}
          className="box-border max-h-[inherit] overflow-auto p-1 outline-0 [clip-path:inset(0_0_0_0_round_.75rem)]"
        >
          {children}
        </ListBox>
      </Popover>
    </AriaComboBox>
  );
}

export function ComboBoxItem(props: ListBoxItemProps) {
  return <DropdownItem {...props} />;
}

export function ComboBoxSection<T extends object>(
  props: DropdownSectionProps<T>,
) {
  return <DropdownSection {...props} />;
}
