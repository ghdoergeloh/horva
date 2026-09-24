"use client";

import type { DropZoneProps } from "react-aria-components";
import {
  composeRenderProps,
  DropZone as RACDropZone,
} from "react-aria-components";
import { tv } from "tailwind-variants";

const dropZone = tv({
  base: "flex items-center justify-center p-8 min-h-24 w-[30%] font-sans text-base text-balance text-center rounded-lg border border-1 border-border bg-background",
  variants: {
    isFocusVisible: {
      true: "outline outline-2 -outline-offset-1 outline-ring forced-colors:outline-[Highlight]",
    },
    isDropTarget: {
      true: "bg-primary/10 outline outline-2 -outline-offset-1 outline-ring forced-colors:outline-[Highlight]",
    },
  },
});

export function DropZone(props: DropZoneProps) {
  return (
    <RACDropZone
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        dropZone({ ...renderProps, className }),
      )}
    />
  );
}
