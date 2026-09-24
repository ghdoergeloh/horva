"use client";

import type { LinkProps as AriaLinkProps } from "react-aria-components";
import { Link as AriaLink, composeRenderProps } from "react-aria-components";
import { tv } from "tailwind-variants";

import { focusRing } from "@horva/ui";

interface LinkProps extends AriaLinkProps {
  variant?: "primary" | "secondary";
}

const styles = tv({
  extend: focusRing,
  base: "underline disabled:no-underline disabled:cursor-default forced-colors:disabled:text-[GrayText] transition rounded-xs [-webkit-tap-highlight-color:transparent]",
  variants: {
    variant: {
      primary:
        "text-primary underline decoration-primary/60 hover:decoration-primary ",
      secondary:
        "text-foreground underline decoration-foreground/50 hover:decoration-foreground ",
    },
  },
  defaultVariants: {
    variant: "primary",
  },
});

export function Link(props: LinkProps) {
  return (
    <AriaLink
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        styles({ ...renderProps, className, variant: props.variant }),
      )}
    />
  );
}
