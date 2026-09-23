"use client";

import type {
  TabListProps,
  TabPanelProps,
  TabPanelsProps,
  TabProps,
  TabsProps,
} from "react-aria-components";
import {
  composeRenderProps,
  Tab as RACTab,
  TabList as RACTabList,
  TabPanel as RACTabPanel,
  TabPanels as RACTabPanels,
  Tabs as RACTabs,
  SelectionIndicator,
} from "react-aria-components";
import { twMerge } from "tailwind-merge";
import { tv } from "tailwind-variants";

import { focusRing } from "@repo/ui";

const tabsStyles = tv({
  base: "flex gap-4 font-sans max-w-full",
  variants: {
    orientation: {
      horizontal: "flex-col",
      vertical: "flex-row",
    },
  },
});

export function Tabs(props: TabsProps) {
  return (
    <RACTabs
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        tabsStyles({ ...renderProps, className }),
      )}
    />
  );
}

const tabListStyles = tv({
  base: "flex max-w-full p-1 -m-1 overflow-x-auto overflow-y-clip [scrollbar-width:none]",
  variants: {
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col items-start",
    },
  },
});

export function TabList<T extends object>(props: TabListProps<T>) {
  return (
    <RACTabList
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        tabListStyles({ ...renderProps, className }),
      )}
    />
  );
}

const tabProps = tv({
  extend: focusRing,
  base: "group relative isolate flex items-center cursor-default rounded-full text-foreground selected:text-primary-foreground forced-colors:selected:text-[HighlightText] px-3 py-1.5 text-sm font-medium transition forced-color-adjust-none [-webkit-tap-highlight-color:transparent]",
  variants: {
    isDisabled: {
      true: "text-muted-foreground/50 forced-colors:text-[GrayText] selected:text-muted-foreground forced-colors:selected:text-[HighlightText]",
    },
  },
});

export function Tab(props: TabProps) {
  return (
    <RACTab
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        tabProps({ ...renderProps, className }),
      )}
    >
      {composeRenderProps(props.children, (children) => (
        <>
          {children}
          <SelectionIndicator className="bg-primary group-disabled:bg-muted absolute top-0 left-0 -z-1 h-full w-full rounded-full motion-safe:transition-[translate,width,height] forced-colors:bg-[Highlight] forced-colors:group-disabled:bg-[GrayText]" />
        </>
      ))}
    </RACTab>
  );
}

export function TabPanels<T extends object>(props: TabPanelsProps<T>) {
  return (
    <RACTabPanels
      {...props}
      className={twMerge(
        "relative h-(--tab-panel-height) overflow-clip motion-safe:transition-[height]",
        props.className,
      )}
    />
  );
}

const tabPanelStyles = tv({
  extend: focusRing,
  base: "flex-1 box-border p-4 text-sm text-foreground transition entering:opacity-0 exiting:opacity-0 exiting:absolute exiting:top-0 exiting:left-0 exiting:w-full",
});

export function TabPanel(props: TabPanelProps) {
  return (
    <RACTabPanel
      {...props}
      className={composeRenderProps(props.className, (className, renderProps) =>
        tabPanelStyles({ ...renderProps, className }),
      )}
    />
  );
}
