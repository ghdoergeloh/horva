"use client";

import type { ReactNode } from "react";
import type {
  CheckboxFieldProps,
  ValidationResult,
} from "react-aria-components";
import { Check, Minus } from "lucide-react";
import {
  CheckboxButton,
  CheckboxField,
  composeRenderProps,
} from "react-aria-components";

import { focusRing } from "@horva/ui";

import { tv } from "../lib/tw";
import { Description, FieldError } from "./Field";

const checkboxStyles = tv({
  base: "flex gap-2 items-center group font-sans text-body transition relative [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      false: "text-foreground",
      true: "opacity-45 forced-colors:text-[GrayText]",
    },
  },
});

const boxStyles = tv({
  extend: focusRing,
  base: "size-5 box-border shrink-0 rounded-sm flex items-center justify-center border transition",
  variants: {
    isSelected: {
      false:
        "bg-input border-(--color) [--color:var(--color-input-border)] group-pressed:[--color:var(--color-foreground)]",
      true: "bg-(--color) border-(--color) [--color:var(--color-primary)] group-pressed:opacity-80 forced-colors:[--color:Highlight]!",
    },
    isInvalid: {
      true: "[--color:var(--color-destructive)] forced-colors:[--color:Mark]!",
    },
    isDisabled: {
      true: "forced-colors:[--color:GrayText]!",
    },
    isHovered: {
      true: "",
    },
  },
  // Hover shows that the box can be ticked; not when disabled, and an
  // invalid box keeps its red border.
  compoundVariants: [
    {
      isSelected: false,
      isHovered: true,
      isDisabled: false,
      isInvalid: false,
      class: "bg-accent [--color:var(--color-primary)]",
    },
  ],
});

const iconStyles =
  "w-3.5 h-3.5 text-primary-foreground group-disabled:text-muted-foreground forced-colors:text-[HighlightText] pointer-events-none";

export interface CheckboxProps extends CheckboxFieldProps {
  children?: ReactNode;
  /** Shows a faint check mark on hover, where ticking off is the action. */
  previewCheck?: boolean;
  description?: string;
  errorMessage?: string | ((validation: ValidationResult) => string);
}

/**
 * A checkbox with an optional description and error message below it.
 */
export function Checkbox({ previewCheck = false, ...props }: CheckboxProps) {
  return (
    <CheckboxField {...props} className="group flex flex-col gap-1">
      <CheckboxButton
        className={composeRenderProps(
          props.className,
          (className, renderProps) =>
            checkboxStyles({ ...renderProps, className }),
        )}
      >
        {composeRenderProps(
          props.children,
          (children, { isSelected, isIndeterminate, ...renderProps }) => (
            <>
              <div
                className={boxStyles({
                  isSelected: isSelected || isIndeterminate,
                  ...renderProps,
                })}
              >
                {isIndeterminate ? (
                  <Minus aria-hidden className={iconStyles} />
                ) : isSelected ? (
                  <Check aria-hidden className={iconStyles} />
                ) : previewCheck && !renderProps.isDisabled ? (
                  <Check
                    aria-hidden
                    className={`text-primary pointer-events-none h-3.5 w-3.5 transition-opacity ${renderProps.isHovered ? "opacity-70" : "opacity-0"}`}
                  />
                ) : null}
              </div>
              {children}
            </>
          ),
        )}
      </CheckboxButton>
      {props.description && (
        <Description className="ms-7">{props.description}</Description>
      )}
      <FieldError className="ms-7">{props.errorMessage}</FieldError>
    </CheckboxField>
  );
}
