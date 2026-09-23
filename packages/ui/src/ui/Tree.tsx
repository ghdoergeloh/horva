"use client";

import type {
  TreeItemProps as AriaTreeItemProps,
  TreeProps,
} from "react-aria-components";
import { ChevronRight } from "lucide-react";
import {
  Tree as AriaTree,
  TreeItem as AriaTreeItem,
  TreeItemContent as AriaTreeItemContent,
  Button,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@repo/ui";

import { Checkbox } from "./Checkbox";

const itemStyles = tv({
  extend: focusRing,
  base: "relative font-sans flex group gap-3 cursor-default select-none py-1 px-3 text-sm text-foreground bg-background border-t border-transparent first:border-t-0 -outline-offset-2 first:rounded-t-lg last:rounded-b-lg",
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

export function Tree<T extends object>({ children, ...props }: TreeProps<T>) {
  return (
    <AriaTree
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "border-border relative w-48 max-w-full overflow-auto rounded-lg border",
      )}
    >
      {children}
    </AriaTree>
  );
}

const expandButton = tv({
  extend: focusRing,
  base: "border-0 p-0 bg-transparent shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-start cursor-default [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
  },
});

const chevron = tv({
  base: "w-4.5 h-4.5 text-muted-foreground transition-transform duration-200 ease-in-out",
  variants: {
    isExpanded: {
      true: "transform rotate-90",
    },
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
  },
});

export interface TreeItemProps extends Partial<AriaTreeItemProps> {
  title: string;
}

export function TreeItem(props: TreeItemProps) {
  return (
    <AriaTreeItem className={itemStyles} textValue={props.title} {...props}>
      <AriaTreeItemContent {...props}>
        {({
          selectionMode,
          selectionBehavior,
          hasChildItems,
          isExpanded,
          isDisabled,
        }) => (
          <div className={`flex items-center`}>
            {selectionMode !== "none" && selectionBehavior === "toggle" && (
              <Checkbox slot="selection" />
            )}
            <div className="w-[calc(calc(var(--tree-item-level)_-_1)_*_calc(var(--spacing)_*_3))] shrink-0" />
            {hasChildItems ? (
              <Button slot="chevron" className={expandButton({ isDisabled })}>
                <ChevronRight
                  aria-hidden
                  className={chevron({ isExpanded, isDisabled })}
                />
              </Button>
            ) : (
              <div className="h-8 w-8 shrink-0" />
            )}
            {props.title}
          </div>
        )}
      </AriaTreeItemContent>
      {props.children}
    </AriaTreeItem>
  );
}
