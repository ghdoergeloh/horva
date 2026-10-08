"use client";

import type React from "react";
import type { Key } from "react-aria-components";
import { useContext, useRef, useState } from "react";
import {
  DisclosureStateContext,
  Button as RACButton,
  TooltipTrigger,
} from "react-aria-components";

import { focusRing } from "@horva/ui";

import type { ProjectColor } from "./Chip";
import type { HourRange } from "./DayBarsModel";
import { tv, twMerge } from "../lib/tw";
import { projectColorValue } from "./Chip";
import {
  defaultHourRange,
  formatClock,
  formatDuration,
  formatHour,
  getHourRange,
  isSameDay,
  minutesOnDay,
  placeSpan,
  totalMinutesOnDay,
} from "./DayBarsModel";
import { Disclosure, DisclosurePanel } from "./Disclosure";
import { DisclosureGroup } from "./DisclosureGroup";
import { Tooltip } from "./Tooltip";

export type { HourRange } from "./DayBarsModel";
export { getHourRange } from "./DayBarsModel";

/** One block in a day bar: a slot, or a work period. */
export interface DayBarsBlock {
  id: Key;
  start: Date;
  /** `null` while the block is running; it then ends at `now`. */
  end: Date | null;
  /** The first line of the tooltip: the task, or "Arbeitszeit". */
  title: string;
  /** The second line of the tooltip, such as the project. */
  subtitle?: string;
  /** The project color. Work periods ignore it and use `primary`. */
  color?: ProjectColor | null;
}

/** One day of the week. */
export interface DayBarsDay {
  /** The key for opening the day. */
  id: Key;
  date: Date;
  blocks: readonly DayBarsBlock[];
}

/** All texts of the day bars. Each one has a German default. */
export interface DayBarsLabels {
  /** The end of a running block. */
  now: string;
  /** Between start and end in the name of a block. */
  to: string;
  /** After a duration in the tooltip. */
  hours: string;
  /** The name of a day, such as `Mo., 5.`. */
  dayName: (date: Date) => string;
  /** The name of the total of a day for screen readers. */
  total: (duration: string) => string;
}

const defaultLabels: DayBarsLabels = {
  now: "jetzt",
  to: "bis",
  hours: "h",
  dayName: (date) =>
    new Intl.DateTimeFormat("de-DE", {
      weekday: "short",
      day: "numeric",
    }).format(date),
  total: (duration) => `Summe ${duration} h`,
};

export interface DayBarsProps {
  days: readonly DayBarsDay[];
  /** The current time: the end of running blocks and the mark of today. */
  now: Date;
  /**
   * `slots` shows blocks in their project color, `periods` shows merged
   * work periods in `primary`. @default 'slots'
   */
  variant?: "slots" | "periods";
  /** The hours of the scale. By default from the earliest start to the latest end. */
  range?: HourRange;
  /** The hours of the scale for a week without blocks. @default 8 to 18 */
  emptyRange?: HourRange;
  /**
   * The content of an opened day, such as the slot table. Without it the
   * days cannot be opened.
   */
  renderDay?: (day: DayBarsDay) => React.ReactNode;
  expandedDays?: Iterable<Key>;
  defaultExpandedDays?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  /** Called on click or Enter on a block. */
  onSlotPress?: (block: DayBarsBlock, day: DayBarsDay) => void;
  labels?: Partial<DayBarsLabels>;
  className?: string;
}

/** Day, bar and total share these columns with the scale (#58). */
const columns =
  "grid grid-cols-[4rem_minmax(0,1fr)_3.5rem] gap-x-3 @max-lg:grid-cols-[4rem_minmax(0,1fr)]";

const blockStyles = tv({
  base: "absolute inset-y-[3px] min-w-0.5 cursor-default rounded-[4px] ring-1 ring-muted outline-0 hover:inset-y-px hover:z-10 hover:ring-foreground hover:ring-offset-2 hover:ring-offset-card data-focus-visible:inset-y-px data-focus-visible:z-10 data-focus-visible:ring-foreground data-focus-visible:ring-offset-2 data-focus-visible:ring-offset-card forced-colors:bg-[ButtonText]",
  variants: {
    isRunning: {
      true: "motion-safe:animate-running-pulse after:bg-running after:absolute after:-inset-y-1 after:-right-0.5 after:w-0.5 after:rounded-full",
    },
  },
});

const dayNameStyles = tv({
  extend: focusRing,
  base: "text-small max-w-full truncate rounded-sm text-right font-medium whitespace-nowrap",
  variants: {
    isToday: {
      true: "text-primary font-semibold",
      false: "text-muted-foreground",
    },
    isButton: {
      true: "cursor-default hover:underline underline-offset-4",
    },
  },
});

/** The CSS background of a block: its color, striped orange while it runs. */
function blockBackground(color: string, isRunning: boolean) {
  if (!isRunning) return color;
  return `repeating-linear-gradient(135deg, ${color} 0 6px, var(--running) 6px 9px)`;
}

/** The hour labels above the bars, in the same column as the bars. */
function Scale({ range }: { range: HourRange }) {
  const hours = Array.from(
    { length: range.endHour - range.startHour + 1 },
    (_, i) => range.startHour + i,
  );
  const last = hours.length - 1;
  return (
    <div
      aria-hidden
      className="text-muted-foreground relative col-start-2 h-4.5 font-mono text-[12px] leading-4 font-medium tabular-nums"
    >
      {hours.map((hour, i) => (
        <span
          key={hour}
          className={twMerge(
            "absolute top-0 -translate-x-1/2",
            // On a narrow screen every second hour, and the outer labels
            // stay inside the bar.
            i % 2 === 1 && "@max-lg:hidden",
            i === 0 && "@max-lg:translate-x-0",
            i === last && "@max-lg:-translate-x-full",
          )}
          style={{ left: `${String((i / last) * 100)}%` }}
        >
          {formatHour(hour)}
        </span>
      ))}
    </div>
  );
}

interface TrackProps {
  day: DayBarsDay;
  name: string;
  now: Date;
  range: HourRange;
  variant: "slots" | "periods";
  labels: DayBarsLabels;
  onSlotPress?: (block: DayBarsBlock, day: DayBarsDay) => void;
  onTrackClick?: () => void;
}

/**
 * The bar of one day. One block is in the tab order; the arrow keys, Home
 * and End move between the blocks of the day.
 */
function Track({
  day,
  name,
  now,
  range,
  variant,
  labels,
  onSlotPress,
  onTrackClick,
}: TrackProps) {
  const blocks = [...day.blocks]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .flatMap((block) => {
      const minutes = minutesOnDay(block, day.date, now);
      return minutes ? [{ block, place: placeSpan(minutes, range) }] : [];
    });
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const lines = Array.from(
    { length: Math.max(0, range.endHour - range.startHour - 1) },
    (_, i) => ((i + 1) / (range.endHour - range.startHour)) * 100,
  );

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const target = {
      ArrowRight: index + 1,
      ArrowDown: index + 1,
      ArrowLeft: index - 1,
      ArrowUp: index - 1,
      Home: 0,
      End: blocks.length - 1,
    }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    const next = Math.min(blocks.length - 1, Math.max(0, target));
    setActive(next);
    refs.current[next]?.focus();
  }

  return (
    // A click on the free bar opens the day, a shortcut for the mouse. The
    // keyboard opens it with the day name.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events
    <div
      role={blocks.length > 0 ? "group" : undefined}
      aria-label={blocks.length > 0 ? name : undefined}
      className="bg-muted relative h-7 rounded-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onTrackClick?.();
      }}
    >
      {lines.map((left) => (
        <span
          key={left}
          aria-hidden
          className="bg-border pointer-events-none absolute inset-y-0 w-px"
          style={{ left: `${String(left)}%` }}
        />
      ))}
      {blocks.map(({ block, place }, index) => {
        const isRunning = block.end === null;
        const color =
          variant === "periods"
            ? "var(--primary)"
            : projectColorValue(block.color);
        const from = formatClock(block.start);
        const to = isRunning ? labels.now : formatClock(block.end ?? now);
        const minutes = minutesOnDay(block, day.date, now);
        const duration = formatDuration(
          minutes ? minutes.end - minutes.start : 0,
        );
        const name = [block.title, block.subtitle, `${from} ${labels.to} ${to}`]
          .filter(Boolean)
          .join(", ");
        return (
          <TooltipTrigger key={block.id} delay={300} closeDelay={0}>
            <RACButton
              ref={(element) => {
                refs.current[index] = element;
              }}
              aria-label={name}
              data-running={isRunning || undefined}
              excludeFromTabOrder={
                index !== Math.min(active, blocks.length - 1)
              }
              onFocus={() => setActive(index)}
              onKeyDown={(e) => onKeyDown(e, index)}
              onPress={() => onSlotPress?.(block, day)}
              className={blockStyles({ isRunning })}
              style={{
                left: `${String(place.left)}%`,
                width: `${String(place.width)}%`,
                background: blockBackground(color, isRunning),
              }}
            />
            <Tooltip placement="top">
              <b className="block font-semibold">{block.title}</b>
              {block.subtitle && (
                <span className="block">{block.subtitle}</span>
              )}
              <span className="block font-mono tabular-nums">
                {from}–{to} · {duration} {labels.hours}
              </span>
            </Tooltip>
          </TooltipTrigger>
        );
      })}
    </div>
  );
}

interface DayRowProps extends Omit<TrackProps, "name" | "onTrackClick"> {
  isToday: boolean;
  /** Present when the day can be opened. */
  content?: React.ReactNode;
}

/** The day name, the bar and the total, and the opened content below. */
function DayRow({ isToday, content, ...track }: DayRowProps) {
  const { day, now, labels } = track;
  const disclosure = useContext(DisclosureStateContext);
  const name = labels.dayName(day.date);
  const total = formatDuration(totalMinutesOnDay(day.blocks, day.date, now));
  const hasTotal = day.blocks.length > 0;
  const totalText = (
    <>
      <span aria-hidden>{hasTotal ? total : ""}</span>
      {hasTotal && <span className="sr-only">{labels.total(total)}</span>}
    </>
  );
  return (
    <>
      <div className="flex min-w-0 flex-col items-end">
        {content === undefined ? (
          <span className={dayNameStyles({ isToday })}>{name}</span>
        ) : (
          <RACButton
            slot="trigger"
            className={(renderProps) =>
              dayNameStyles({ ...renderProps, isToday, isButton: true })
            }
          >
            {name}
          </RACButton>
        )}
        <span className="type-duration-small text-foreground hidden @max-lg:block">
          {totalText}
        </span>
      </div>
      <Track
        {...track}
        name={name}
        onTrackClick={disclosure ? () => disclosure.toggle() : undefined}
      />
      <span className="type-duration-small text-foreground text-right @max-lg:hidden">
        {totalText}
      </span>
      {content !== undefined && (
        <DisclosurePanel className="col-span-full">{content}</DisclosurePanel>
      )}
    </>
  );
}

/**
 * The week as day bars on a shared hour scale: one bar per day with the
 * slots in their project color, or the work periods in `primary`, and the
 * total of the day. A running block is striped orange and counts up to
 * `now`. With `renderDay` a day opens below its bar.
 */
export function DayBars({
  days,
  now,
  variant = "slots",
  range: rangeProp,
  emptyRange = defaultHourRange,
  renderDay,
  expandedDays,
  defaultExpandedDays,
  onExpandedChange,
  onSlotPress,
  labels: labelOverrides,
  className,
}: DayBarsProps) {
  const labels = { ...defaultLabels, ...labelOverrides };
  const range =
    rangeProp ??
    getHourRange(
      days.map((day) => ({ date: day.date, spans: day.blocks })),
      now,
      emptyRange,
    );
  return (
    <div className={twMerge("@container font-sans", className)}>
      <DisclosureGroup
        allowsMultipleExpanded
        expandedKeys={expandedDays}
        defaultExpandedKeys={defaultExpandedDays}
        onExpandedChange={onExpandedChange}
        className={twMerge(columns, "items-center gap-y-2")}
      >
        <Scale range={range} />
        {days.map((day) => {
          const row = (
            <DayRow
              day={day}
              now={now}
              range={range}
              variant={variant}
              labels={labels}
              onSlotPress={onSlotPress}
              isToday={isSameDay(day.date, now)}
              content={renderDay?.(day)}
            />
          );
          return renderDay ? (
            <Disclosure
              key={day.id}
              id={day.id}
              className="col-span-full grid min-w-0 grid-cols-subgrid items-center gap-y-2 rounded-none"
            >
              {row}
            </Disclosure>
          ) : (
            <div
              key={day.id}
              className="col-span-full grid grid-cols-subgrid items-center"
            >
              {row}
            </div>
          );
        })}
      </DisclosureGroup>
    </div>
  );
}
