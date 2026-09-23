"use client";

import type { ButtonProps as RACButtonProps } from "react-aria-components";
import { composeRenderProps, Button as RACButton } from "react-aria-components";
import { tv } from "tailwind-variants";

import { focusRing } from "@repo/ui";

export interface ButtonProps extends RACButtonProps {
  /** @default 'primary' */
  variant?: "primary" | "secondary" | "destructive" | "quiet";
}

const spinnerColors = {
  primary: "text-primary-foreground",
  secondary: "text-secondary-foreground",
  destructive: "text-destructive-foreground",
  quiet: "text-foreground",
} as const;

const button = tv({
  extend: focusRing,
  base: "relative inline-flex items-center justify-center gap-2 border border-transparent h-9 box-border px-3.5 py-0 [&:has(>svg:only-child)]:px-0 [&:has(>svg:only-child)]:h-8 [&:has(>svg:only-child)]:w-8 font-sans text-sm text-center transition rounded-lg cursor-default [-webkit-tap-highlight-color:transparent]",
  variants: {
    variant: {
      primary:
        "bg-primary hover:bg-primary/90 pressed:bg-primary/80 text-primary-foreground",
      secondary:
        "border-border bg-secondary hover:bg-secondary/80 pressed:bg-secondary/60 text-secondary-foreground",
      destructive:
        "bg-destructive hover:bg-destructive/90 pressed:bg-destructive/80 text-destructive-foreground",
      quiet:
        "border-0 bg-transparent hover:bg-accent pressed:bg-muted-foreground/20 text-foreground",
    },
    isDisabled: {
      true: "border-transparent bg-muted text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
    isPending: {
      true: "text-transparent",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
  compoundVariants: [
    {
      variant: "quiet",
      isDisabled: true,
      class: "bg-transparent",
    },
  ],
});

export function Button(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({ ...renderProps, variant: props.variant, className }),
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
              <svg
                className={`h-4 w-4 animate-spin ${spinnerColors[props.variant ?? "primary"]}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="4"
                  fill="none"
                  className="opacity-25"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  strokeWidth="4"
                  strokeLinecap="round"
                  fill="none"
                  pathLength="100"
                  strokeDasharray="60 140"
                  strokeDashoffset="0"
                />
              </svg>
            </span>
          )}
        </>
      ))}
    </RACButton>
  );
}
