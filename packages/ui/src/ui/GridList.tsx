"use client";

import type { HTMLAttributes } from "react";
import type { GridListItemProps, GridListProps } from "react-aria-components";
import {
  GridList as AriaGridList,
  GridListHeader as AriaGridListHeader,
  GridListItem as AriaGridListItem,
  Button,
  composeRenderProps,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

import { Checkbox } from "./Checkbox";

export function GridList<T extends object>({
  children,
  ...props
}: GridListProps<T>) {
  return (
    <AriaGridList
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "border-border bg-background relative w-[200px] overflow-auto rounded-lg border font-sans empty:flex empty:items-center empty:justify-center empty:text-sm empty:italic",
      )}
    >
      {children}
    </AriaGridList>
  );
}

const itemStyles = tv({
  extend: focusRing,
  base: "relative flex gap-3 cursor-default select-none py-2 px-3 text-sm text-foreground border-t border-transparent first:border-t-0 first:rounded-t-lg last:rounded-b-lg last:mb-0 -outline-offset-2",
  variants: {
    isSelected: {
      false: "hover:bg-accent pressed:bg-accent ",
      true: "bg-primary/10 hover:bg-primary/20 pressed:bg-primary/20 border-y-primary/20 z-20",
    },
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText] z-10",
    },
  },
});

export function GridListItem({ children, ...props }: GridListItemProps) {
  const textValue = typeof children === "string" ? children : undefined;
  return (
    <AriaGridListItem textValue={textValue} {...props} className={itemStyles}>
      {composeRenderProps(
        children,
        (children, { selectionMode, selectionBehavior, allowsDragging }) => (
          <>
            {/* Add elements for drag and drop and selection. */}
            {allowsDragging && <Button slot="drag">≡</Button>}
            {selectionMode !== "none" && selectionBehavior === "toggle" && (
              <Checkbox slot="selection" />
            )}
            {children}
          </>
        ),
      )}
    </AriaGridListItem>
  );
}

export function GridListHeader({
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <AriaGridListHeader
      {...props}
      className={twMerge(
        "border-y-border bg-muted/60 text-muted-foreground supports-[-moz-appearance:none]:bg-muted z-10 -mt-px border-y px-4 py-1 text-sm font-semibold backdrop-blur-md",
        props.className,
      )}
    >
      {children}
    </AriaGridListHeader>
  );
}
