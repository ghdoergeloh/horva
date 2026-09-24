"use client";

import type React from "react";
import type {
  DisclosurePanelProps as AriaDisclosurePanelProps,
  DisclosureProps as AriaDisclosureProps,
} from "react-aria-components";
import { useContext } from "react";
import { ChevronRight } from "lucide-react";
import {
  Disclosure as AriaDisclosure,
  DisclosurePanel as AriaDisclosurePanel,
  composeRenderProps,
  DisclosureStateContext,
  Heading,
} from "react-aria-components";
import { tv } from "tailwind-variants";

import { composeTailwindRenderProps } from "@horva/ui";

import { Button } from "./Button";

const disclosure = tv({
  base: "group min-w-50 font-sans rounded-lg text-foreground",
});

const chevron = tv({
  base: "w-4 h-4 text-muted-foreground transition-transform duration-200 ease-in-out",
  variants: {
    isExpanded: {
      true: "transform rotate-90",
    },
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText]",
    },
  },
});

export interface DisclosureProps extends AriaDisclosureProps {
  children: React.ReactNode;
}

export function Disclosure({ children, ...props }: DisclosureProps) {
  return (
    <AriaDisclosure
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        disclosure({ ...renderProps, className }),
      )}
    >
      {children}
    </AriaDisclosure>
  );
}

export interface DisclosureHeaderProps {
  children: React.ReactNode;
}

const useDisclosureStateContext = () => {
  const context = useContext(DisclosureStateContext);
  if (!context) {
    throw new Error(
      "useDisclosureStateContext must be used within a Disclosure",
    );
  }
  return context;
};

export function DisclosureHeader({ children }: DisclosureHeaderProps) {
  const { isExpanded } = useDisclosureStateContext();
  return (
    <Heading className="m-0 text-lg font-semibold">
      <Button
        slot="trigger"
        variant="quiet"
        className="w-full justify-start font-medium"
      >
        {({ isDisabled }) => (
          <>
            <ChevronRight
              aria-hidden
              className={chevron({ isExpanded, isDisabled })}
            />
            <span>{children}</span>
          </>
        )}
      </Button>
    </Heading>
  );
}

export interface DisclosurePanelProps extends AriaDisclosurePanelProps {
  children: React.ReactNode;
}

export function DisclosurePanel({ children, ...props }: DisclosurePanelProps) {
  return (
    <AriaDisclosurePanel
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "h-(--disclosure-panel-height) overflow-clip motion-safe:transition-[height]",
      )}
    >
      <div className="px-4 py-2">{children}</div>
    </AriaDisclosurePanel>
  );
}
