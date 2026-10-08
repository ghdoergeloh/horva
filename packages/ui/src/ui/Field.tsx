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

import { composeTailwindRenderProps } from "@horva/ui";

import { twMerge, tv } from "../lib/tw";

export function Label(props: LabelProps) {
  return (
    <RACLabel
      {...props}
      className={twMerge(
        "text-foreground w-fit cursor-default font-sans text-small font-medium",
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
      className={twMerge(
        "text-muted-foreground text-caption font-normal",
        props.className,
      )}
    />
  );
}

export function FieldError(props: FieldErrorProps) {
  return (
    <RACFieldError
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "text-destructive text-caption font-normal forced-colors:text-[Mark]",
      )}
    />
  );
}

export const fieldBorderStyles = tv({
  base: "transition",
  variants: {
    isFocusWithin: {
      false:
        "border-input-border outline-0 forced-colors:border-[ButtonBorder]",
      true: "border-input-border outline-2 outline-offset-1 outline-ring forced-colors:outline-[Highlight]",
    },
    isInvalid: {
      true: "border-destructive forced-colors:border-[Mark]",
    },
    isDisabled: {
      true: "opacity-45 forced-colors:border-[GrayText]",
    },
    minWidth: {
      none: "",
      small: "min-w-[50px]",
      medium: "min-w-[150px]",
    },
  },
});

export const fieldGroupStyles = tv({
  base: "group flex items-center h-9 box-border bg-input forced-colors:bg-[Field] border rounded-md overflow-hidden transition",
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
        "bg-input text-foreground placeholder:text-muted-foreground min-h-9 min-w-0 flex-1 border-0 px-2.5 py-0 font-sans text-body outline outline-0 [-webkit-tap-highlight-color:transparent]",
      )}
    />
  );
}
