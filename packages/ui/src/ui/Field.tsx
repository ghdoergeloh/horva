"use client";

import type {
  FieldErrorProps,
  GroupProps,
  InputProps,
  LabelProps,
  TextProps,
} from "react-aria-components";
import {
  composeRenderProps,
  Group,
  FieldError as RACFieldError,
  Input as RACInput,
  Label as RACLabel,
  Text,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps, focusRing } from "@horva/ui";

export function Label(props: LabelProps) {
  return (
    <RACLabel
      {...props}
      className={twMerge(
        "text-muted-foreground w-fit cursor-default font-sans text-sm font-medium",
        props.className,
      )}
    />
  );
}

export function Description(props: TextProps) {
  return (
    <Text
      {...props}
      slot="description"
      className={twMerge("text-muted-foreground text-sm", props.className)}
    />
  );
}

export function FieldError(props: FieldErrorProps) {
  return (
    <RACFieldError
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "text-destructive text-sm forced-colors:text-[Mark]",
      )}
    />
  );
}

export const fieldBorderStyles = tv({
  base: "transition",
  variants: {
    isFocusWithin: {
      false:
        "border-border hover:border-muted-foreground forced-colors:border-[ButtonBorder]",
      true: "border-ring forced-colors:border-[Highlight]",
    },
    isInvalid: {
      true: "border-destructive forced-colors:border-[Mark]",
    },
    isDisabled: {
      true: "border-border/50 forced-colors:border-[GrayText]",
    },
    minWidth: {
      none: "",
      small: "min-w-[50px]",
      medium: "min-w-[150px]",
    },
  },
});

export const fieldGroupStyles = tv({
  extend: focusRing,
  base: "group flex items-center h-9 box-border bg-background forced-colors:bg-[Field] border rounded-lg overflow-hidden transition",
  variants: fieldBorderStyles.variants,
  defaultVariants: {
    minWidth: "none",
  },
});

export function FieldGroup(props: GroupProps) {
  return (
    <Group
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        fieldGroupStyles({ ...renderProps, className }),
      )}
    />
  );
}

export function Input(props: InputProps) {
  return (
    <RACInput
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "bg-background text-foreground placeholder:text-muted-foreground disabled:text-muted-foreground/50 disabled:placeholder:text-muted-foreground/50 min-h-9 min-w-0 flex-1 border-0 px-3 py-0 font-sans text-sm outline outline-0 [-webkit-tap-highlight-color:transparent]",
      )}
    />
  );
}
