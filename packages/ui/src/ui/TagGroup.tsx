"use client";

import type {
  TagGroupProps as AriaTagGroupProps,
  TagProps as AriaTagProps,
  TagListProps,
} from "react-aria-components";
import { createContext, useContext } from "react";
import { XIcon } from "lucide-react";
import {
  Tag as AriaTag,
  TagGroup as AriaTagGroup,
  Button,
  composeRenderProps,
  TagList,
  Text,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import { focusRing } from "@horva/ui";

import { Description, Label } from "./Field";

const colors = {
  gray: "bg-background text-muted-foreground border-border hover:border-muted-foreground ",
  green:
    "bg-success/15 text-success border-success/30 hover:border-success/60 ",
  yellow:
    "bg-warning/20 text-warning-foreground border-warning/40 hover:border-warning/70 ",
  blue: "bg-primary/10 text-primary border-primary/20 hover:border-primary/50 ",
};

type Color = keyof typeof colors;
const ColorContext = createContext<Color>("gray");

const tagStyles = tv({
  extend: focusRing,
  base: "transition cursor-default text-xs rounded-full border px-3 py-0.5 flex items-center max-w-fit gap-1 font-sans [-webkit-tap-highlight-color:transparent]",
  variants: {
    color: {
      gray: "",
      green: "",
      yellow: "",
      blue: "",
    },
    allowsRemoving: {
      true: "pr-1",
    },
    isSelected: {
      true: "bg-primary text-primary-foreground border-transparent forced-colors:bg-[Highlight] forced-colors:text-[HighlightText] forced-color-adjust-none",
    },
    isDisabled: {
      true: "bg-muted text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
  },
  compoundVariants: (Object.keys(colors) as Color[]).map((color) => ({
    isSelected: false,
    isDisabled: false,
    color,
    class: colors[color],
  })),
});

export interface TagGroupProps<T>
  extends
    Omit<AriaTagGroupProps, "children">,
    Pick<TagListProps<T>, "items" | "children" | "renderEmptyState"> {
  color?: Color;
  label?: string;
  description?: string;
  errorMessage?: string;
}

export interface TagProps extends AriaTagProps {
  color?: Color;
}

export function TagGroup<T extends object>({
  label,
  description,
  errorMessage,
  items,
  children,
  renderEmptyState,
  ...props
}: TagGroupProps<T>) {
  return (
    <AriaTagGroup
      {...props}
      className={twMerge("flex flex-col gap-2 font-sans", props.className)}
    >
      <Label>{label}</Label>
      <ColorContext.Provider value={props.color ?? "gray"}>
        <TagList
          items={items}
          renderEmptyState={renderEmptyState}
          className="flex flex-wrap gap-1"
        >
          {children}
        </TagList>
      </ColorContext.Provider>
      {description && <Description>{description}</Description>}
      {errorMessage && (
        <Text slot="errorMessage" className="text-destructive text-sm">
          {errorMessage}
        </Text>
      )}
    </AriaTagGroup>
  );
}

const removeButtonStyles = tv({
  extend: focusRing,
  base: "cursor-default rounded-full transition-[background-color] p-0.5 flex items-center justify-center bg-transparent text-[inherit] border-0 hover:bg-foreground/10 pressed:bg-foreground/20",
});

export function Tag({ children, color, ...props }: TagProps) {
  const textValue = typeof children === "string" ? children : undefined;
  const groupColor = useContext(ColorContext);
  return (
    <AriaTag
      textValue={textValue}
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        tagStyles({ ...renderProps, className, color: color ?? groupColor }),
      )}
    >
      {composeRenderProps(children, (children, { allowsRemoving }) => (
        <>
          {children}
          {allowsRemoving && (
            <Button slot="remove" className={removeButtonStyles}>
              <XIcon aria-hidden className="h-3 w-3" />
            </Button>
          )}
        </>
      ))}
    </AriaTag>
  );
}
