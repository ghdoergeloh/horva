"use client";

import type React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { twMerge } from "../lib/tw";
import { Button } from "./Button";
import { ToggleButton } from "./ToggleButton";
import { ToggleButtonGroup } from "./ToggleButtonGroup";
import { formatWeekRange, isNextWeekInFuture } from "./WeekHeaderModel";

export { formatWeekRange } from "./WeekHeaderModel";

/** What an opened day shows: slots, the time per task, or work periods. */
export type TimelineView = "slots" | "tasks" | "periods";

/** All texts of the week header. Each one has a German default. */
export interface WeekHeaderLabels {
  previousWeek: string;
  nextWeek: string;
  thisWeek: string;
  /** The name of the view switch. */
  view: string;
  slots: string;
  tasks: string;
  periods: string;
}

const defaultLabels: WeekHeaderLabels = {
  previousWeek: "Vorherige Woche",
  nextWeek: "Nächste Woche",
  thisWeek: "Diese Woche",
  view: "Ansicht",
  slots: "Slots",
  tasks: "Aufgaben",
  periods: "Arbeitszeiten",
};

export interface WeekHeaderProps {
  /** The first day of the shown week. */
  weekStart: Date;
  /** The current time; "Next week" is off when that week lies in the future. */
  now: Date;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onThisWeek: () => void;
  view: TimelineView;
  onViewChange: (view: TimelineView) => void;
  /** The project filter, such as a `Select`. */
  filter?: React.ReactNode;
  /** Formats the title. @default `5.–11. Oktober 2026` */
  formatTitle?: (weekStart: Date) => string;
  labels?: Partial<WeekHeaderLabels>;
  className?: string;
}

const views: TimelineView[] = ["slots", "tasks", "periods"];

/**
 * The head of the timeline: the week with buttons to page through weeks
 * and back to this week, the project filter, and the switch between the
 * views of an opened day. On a narrow screen it takes two lines.
 */
export function WeekHeader({
  weekStart,
  now,
  onPreviousWeek,
  onNextWeek,
  onThisWeek,
  view,
  onViewChange,
  filter,
  formatTitle = (start) => formatWeekRange(start),
  labels: labelOverrides,
  className,
}: WeekHeaderProps) {
  const labels = { ...defaultLabels, ...labelOverrides };
  return (
    <div className={twMerge("@container font-sans", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-1 @max-lg:w-full">
          <Button
            variant="quiet"
            aria-label={labels.previousWeek}
            onPress={onPreviousWeek}
          >
            <ChevronLeft aria-hidden />
          </Button>
          <h2 className="text-title text-foreground @max-lg:text-heading min-w-0 truncate px-1 @max-lg:flex-1">
            {formatTitle(weekStart)}
          </h2>
          <Button
            variant="quiet"
            aria-label={labels.nextWeek}
            isDisabled={isNextWeekInFuture(weekStart, now)}
            onPress={onNextWeek}
          >
            <ChevronRight aria-hidden />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={onThisWeek}
            className="ms-1 shrink-0"
          >
            {labels.thisWeek}
          </Button>
        </div>
        <div className="ms-auto flex min-w-0 items-center gap-3 @max-lg:w-full">
          {filter && <div className="min-w-0 @max-lg:flex-1">{filter}</div>}
          {/* The arrow keys move the focus and switch the view with it. */}
          {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            className="ms-auto shrink-0"
            onKeyDownCapture={(e) => {
              const step = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
              if (!step) return;
              const buttons = [...e.currentTarget.querySelectorAll("button")];
              const index = buttons.indexOf(e.target as HTMLButtonElement);
              const next = index < 0 ? undefined : views[index + step];
              if (next && next !== view) onViewChange(next);
            }}
          >
            <ToggleButtonGroup
              variant="segmented"
              aria-label={labels.view}
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[view]}
              onSelectionChange={(keys) => {
                const [key] = keys;
                if (views.includes(key as TimelineView))
                  onViewChange(key as TimelineView);
              }}
            >
              {views.map((id) => (
                <ToggleButton key={id} id={id}>
                  {labels[id]}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
