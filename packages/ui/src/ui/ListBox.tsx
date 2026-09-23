"use client";

import type {
  ListBoxProps as AriaListBoxProps,
  ListBoxItemProps,
  SectionProps,
} from "react-aria-components";
import { Check } from "lucide-react";
import {
  ListBox as AriaListBox,
  ListBoxItem as AriaListBoxItem,
  Collection,
  composeRenderProps,
  Header,
  ListBoxSection,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@repo/ui";

interface ListBoxProps<T> extends Omit<
  AriaListBoxProps<T>,
  "layout" | "orientation"
> {}

export function ListBox<T extends object>({
  children,
  ...props
}: ListBoxProps<T>) {
  return (
    <AriaListBox
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "border-border bg-background w-[200px] rounded-lg border p-1 font-sans outline-0",
      )}
    >
      {children}
    </AriaListBox>
  );
}

export const itemStyles = tv({
  extend: focusRing,
  base: "group relative flex items-center gap-8 cursor-default select-none py-1.5 px-2.5 rounded-md will-change-transform text-sm forced-color-adjust-none",
  variants: {
    isSelected: {
      false:
        "text-foreground hover:bg-accent pressed:bg-accent -outline-offset-2",
      true: "bg-primary text-primary-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] [&:has(+[data-selected])]:rounded-b-none [&+[data-selected]]:rounded-t-none -outline-offset-4 outline-primary-foreground forced-colors:outline-[HighlightText]",
    },
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
  },
});

export function ListBoxItem(props: ListBoxItemProps) {
  const textValue =
    props.textValue ??
    (typeof props.children === "string" ? props.children : undefined);
  return (
    <AriaListBoxItem {...props} textValue={textValue} className={itemStyles}>
      {composeRenderProps(props.children, (children) => (
        <>
          {children}
          <div className="bg-primary-foreground/20 absolute right-4 bottom-0 left-4 hidden h-px forced-colors:bg-[HighlightText] [.group[data-selected]:has(+[data-selected])_&]:block" />
        </>
      ))}
    </AriaListBoxItem>
  );
}

export const dropdownItemStyles = tv({
  base: "group flex items-center gap-4 cursor-default select-none py-2 pl-3 pr-3 selected:pr-1 rounded-lg outline outline-0 text-sm forced-color-adjust-none no-underline [&[href]]:cursor-pointer [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      false: "text-foreground",
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
    isPressed: {
      true: "bg-accent",
    },
    isFocused: {
      true: "bg-primary text-primary-foreground forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]",
    },
  },
  compoundVariants: [
    {
      isFocused: false,
      isOpen: true,
      className: "bg-accent",
    },
  ],
});

export function DropdownItem(props: ListBoxItemProps) {
  const textValue =
    props.textValue ??
    (typeof props.children === "string" ? props.children : undefined);
  return (
    <AriaListBoxItem
      {...props}
      textValue={textValue}
      className={dropdownItemStyles}
    >
      {composeRenderProps(props.children, (children, { isSelected }) => (
        <>
          <span className="group-selected:font-semibold flex flex-1 items-center gap-2 truncate font-normal">
            {children}
          </span>
          <span className="flex w-5 items-center">
            {isSelected && <Check className="h-4 w-4" />}
          </span>
        </>
      ))}
    </AriaListBoxItem>
  );
}

export interface DropdownSectionProps<T> extends SectionProps<T> {
  title?: string;
  items: Iterable<T>;
}

export function DropdownSection<T extends object>(
  props: DropdownSectionProps<T>,
) {
  return (
    <ListBoxSection className="after:block after:h-[5px] after:content-[''] first:-mt-[5px] last:after:hidden">
      <Header className="border-y-border bg-muted/60 text-muted-foreground supports-[-moz-appearance:none]:bg-muted sticky -top-[5px] z-10 -mx-1 -mt-px truncate border-y px-4 py-1 text-sm font-semibold backdrop-blur-md [&+*]:mt-1">
        {props.title}
      </Header>
      <Collection items={props.items}>{props.children}</Collection>
    </ListBoxSection>
  );
}
