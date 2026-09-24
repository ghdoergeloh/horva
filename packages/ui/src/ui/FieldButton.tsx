"use client";

import type { ButtonProps as RACButtonProps } from "react-aria-components";
import { composeRenderProps, Button as RACButton } from "react-aria-components";
import { tv } from "tailwind-variants";

import { focusRing } from "@horva/ui";

export interface ButtonProps extends RACButtonProps {
  /** @default 'primary' */
  variant?: "primary" | "secondary" | "destructive" | "icon";
}

const button = tv({
  extend: focusRing,
  base: "relative inline-flex items-center border-0 font-sans text-sm text-center transition rounded-md cursor-default p-1 flex items-center justify-center text-muted-foreground bg-transparent hover:bg-foreground/5 pressed:bg-foreground/10 disabled:bg-transparent [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      true: "bg-muted text-muted-foreground/50 forced-colors:text-[GrayText] border-border/50",
    },
  },
});

export function FieldButton(props: ButtonProps) {
  return (
    <RACButton
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        button({ ...renderProps, className }),
      )}
    >
      {props.children}
    </RACButton>
  );
}
