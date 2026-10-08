"use client";

import type { ButtonProps as RACButtonProps } from "react-aria-components";
import { isValidElement } from "react";
import { composeRenderProps, Button as RACButton } from "react-aria-components";

import { focusRing } from "@horva/ui";

import { tv } from "../lib/tw";
import { Loader } from "./Logo";

export interface ButtonProps extends RACButtonProps {
  /**
   * `primary` at most once per area, `secondary` for "Switch" and
   * "Cancel", `quiet` for actions in cards and lists, `destructive` only
   * for delete.
   * @default 'primary'
   */
  variant?: "primary" | "secondary" | "destructive" | "quiet";
  /** @default 'md' */
  size?: "sm" | "md";
}

const spinnerColors = {
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive-foreground",
  quiet: "text-foreground",
} as const;

const button = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center gap-2 border border-transparent box-border py-0 font-sans font-medium text-center transition-colors rounded-md cursor-default [-webkit-tap-highlight-color:transparent] [&_svg]:size-4 [&_svg]:shrink-0",
  variants: {
    variant: {
      primary:
        "bg-primary hover:bg-primary-hover pressed:bg-primary-hover text-primary-foreground",
      secondary:
        "bg-secondary text-secondary-foreground hover:bg-accent hover:text-accent-foreground pressed:bg-accent pressed:text-accent-foreground",
      destructive:
        "bg-destructive hover:bg-destructive/90 pressed:bg-destructive/80 text-destructive-foreground",
      quiet: "bg-transparent text-foreground hover:bg-accent pressed:bg-accent",
    },
    size: {
      md: "h-9 px-3.5 text-body",
      sm: "h-7.5 px-2.5 text-small",
    },
    iconOnly: {
      true: "px-0 aspect-square",
    },
    isDisabled: {
      true: "opacity-45 forced-colors:text-[GrayText]",
    },
    isPending: {
      true: "text-transparent [&>svg]:invisible",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

/**
 * True when the only child is a component element, such as a lucide icon,
 * and no text: such a button is square. Wrapper tags (`<span>`) count as
 * content.
 */
export function isIconOnly(children: unknown): boolean {
  return isValidElement(children) && typeof children.type !== "string";
}

export function Button(props: ButtonProps) {
  const variant = props.variant ?? "primary";
  const iconOnly = isIconOnly(props.children);
  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({
          ...renderProps,
          variant: props.variant,
          size: props.size,
          iconOnly,
          className,
        }),
      )}
    >
      {composeRenderProps(props.children, (children, { isPending }) => (
        <>
          {children}
          {isPending && (
            <span
              aria-hidden
              className="absolute inset-0 flex items-center justify-center"
            >
              <Loader
                size={16}
                onFill={variant === "primary" || variant === "destructive"}
                className={spinnerColors[variant]}
              />
            </span>
          )}
        </>
      ))}
    </RACButton>
  );
}
