"use client";

import type {
  BreadcrumbProps,
  BreadcrumbsProps,
  LinkProps,
} from "react-aria-components";
import { ChevronRight } from "lucide-react";
import {
  Breadcrumb as AriaBreadcrumb,
  Breadcrumbs as AriaBreadcrumbs,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";

import { composeTailwindRenderProps } from "@timetracker/ui";

import { Link } from "./Link";

export function Breadcrumbs<T extends object>(props: BreadcrumbsProps<T>) {
  return (
    <AriaBreadcrumbs
      {...props}
      className={twMerge("flex gap-1", props.className)}
    />
  );
}

export function Breadcrumb(
  props: BreadcrumbProps & Omit<LinkProps, "className">,
) {
  return (
    <AriaBreadcrumb
      {...props}
      className={composeTailwindRenderProps(
        props.className,
        "flex items-center gap-1",
      )}
    >
      {({ isCurrent }) => (
        <>
          <Link variant="secondary" {...props} />
          {!isCurrent && (
            <ChevronRight className="h-3 w-3 text-neutral-600 dark:text-neutral-400" />
          )}
        </>
      )}
    </AriaBreadcrumb>
  );
}
