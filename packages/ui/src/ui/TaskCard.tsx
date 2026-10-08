"use client";

import type React from "react";
import { useState } from "react";
import {
  Calendar,
  CalendarPlus,
  CalendarX2,
  Play,
  Repeat,
  Square,
} from "lucide-react";
import { DialogTrigger, Button as RACButton } from "react-aria-components";

import { focusRing } from "@horva/ui";

import type { FormatDuration } from "../lib/duration";
import type { ProjectColor } from "./Chip";
import { formatDuration } from "../lib/duration";
import { tv, twMerge } from "../lib/tw";
import { Button } from "./Button";
import { Checkbox } from "./Checkbox";
import { Chip, LiveBadge } from "./Chip";

/** The texts of the TaskCard. German by default. */
export interface TaskCardStrings {
  markDone: string;
  reopen: string;
  start: string;
  stop: string;
  planToday: string;
  /** Shown on the date chip when no date is set. */
  noDate: string;
  /** Accessible name of the date chip, before the date. */
  date: string;
  overdue: string;
  activity: string;
  /** Button of an activity: done for today, on to its next date. */
  activityDone: string;
  running: string;
  /** Accessible name of the total time, before the time. */
  total: string;
}

export const taskCardStrings: TaskCardStrings = {
  markDone: "Erledigt",
  reopen: "Wieder öffnen",
  start: "Starten",
  stop: "Stoppen",
  planToday: "Heute",
  noDate: "Datum",
  date: "Datum",
  overdue: "überfällig",
  activity: "Aktivität",
  activityDone: "Für heute erledigt",
  running: "läuft",
  total: "Gesamtzeit",
};

export interface TaskCardProps {
  title: string;
  /** An activity repeats; it has no checkbox and is never done. */
  kind?: "task" | "activity";
  isDone?: boolean;
  isRunning?: boolean;
  isOverdue?: boolean;
  project?: { name: string; color: ProjectColor | null } | null;
  /** Names of the labels, shown as neutral chips. */
  labels?: string[];
  /** Total time of the task, in minutes. */
  totalMinutes?: number;
  /** Rule of an activity, such as "wochentags 09:00". */
  activityInfo?: string;
  /** Text of the date chip, such as "Heute" or "gestern 17:00". */
  dateLabel?: string | null;
  /** Hides the "Heute" button. */
  isPlannedToday?: boolean;
  onToggleDone?: (isDone: boolean) => void;
  /**
   * An activity is done for today: it moves on to its next date. Shown as
   * the repeat button in front of the card.
   */
  onActivityDone?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  onPlanToday?: () => void;
  /** Called when the date chip is pressed and no `datePopover` is given. */
  onDateClick?: () => void;
  /**
   * A `Popover` that opens from the date chip, such as one with a calendar.
   * The card opens it on press and on the `D` key.
   */
  datePopover?: React.ReactNode;
  /** More actions, such as a menu button. Shown on hover and focus. */
  actions?: React.ReactNode;
  strings?: Partial<TaskCardStrings>;
  formatDuration?: FormatDuration;
  className?: string;
}

const dateChip = tv({
  extend: focusRing,
  base: "inline-flex h-5.5 cursor-default items-center gap-1 rounded-sm border bg-transparent px-1.5 font-mono text-xs leading-4 font-medium [&_svg]:size-3.5",
  variants: {
    state: {
      empty: "border-dashed border-input-border text-muted-foreground",
      set: "border-border text-foreground",
      overdue: "border-destructive text-destructive",
    },
    onRunning: { true: "" },
  },
  compoundVariants: [
    { state: "empty", onRunning: true, className: "text-foreground" },
  ],
});

/** True for keys that typing in a field needs. */
function isTextField(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      target.tagName === "TEXTAREA" ||
      (target.tagName === "INPUT" &&
        !["checkbox", "radio", "button"].includes(
          (target as HTMLInputElement).type,
        )))
  );
}

/** What a key does on a focused card. */
export type TaskCardShortcut =
  | "toggleDone"
  | "start"
  | "stop"
  | "planToday"
  | "openDate";

/** The state of the card that decides which keys work. */
export interface TaskCardKeyState {
  /** True when the card itself has focus, not one of its buttons. */
  onCard: boolean;
  canToggleDone: boolean;
  isDone: boolean;
  isRunning: boolean;
  canPlanToday: boolean;
  canOpenDate: boolean;
}

/**
 * The action of a key on a focused card: Space ticks it off (only on the
 * card itself, buttons keep their Space), `S` starts or stops, `H` plans
 * it for today, `D` opens the date. Null when the key does nothing.
 */
export function taskCardShortcut(
  key: string,
  state: TaskCardKeyState,
): TaskCardShortcut | null {
  switch (key.toLowerCase()) {
    case " ":
      return state.onCard && state.canToggleDone ? "toggleDone" : null;
    case "s":
      if (state.isDone) return null;
      return state.isRunning ? "stop" : "start";
    case "h":
      return state.canPlanToday ? "planToday" : null;
    case "d":
      return state.canOpenDate ? "openDate" : null;
    default:
      return null;
  }
}

/** Which parts a card shows, from its props. */
function cardState(props: {
  kind: "task" | "activity";
  isDone: boolean;
  isRunning: boolean;
  isPlannedToday: boolean;
  hasPlanToday: boolean;
  hasDate: boolean;
}) {
  const isActivity = props.kind === "activity";
  // An activity is never done; a done task does not run.
  const done = props.isDone && !isActivity;
  return {
    isActivity,
    done,
    running: props.isRunning && !done,
    showToday: !done && !props.isPlannedToday && props.hasPlanToday,
    showDate: !done && !isActivity && props.hasDate,
  };
}

/** Runs the action of a key pressed on the card or inside it. */
function handleCardKey(
  event: React.KeyboardEvent<HTMLDivElement>,
  state: Omit<TaskCardKeyState, "onCard">,
  actions: Record<TaskCardShortcut, () => void>,
) {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  // Keys from portals, such as the date popover or a menu, reach the card
  // through React but belong to them.
  if (!event.currentTarget.contains(event.target as Node)) return;
  if (isTextField(event.target)) return;
  const shortcut = taskCardShortcut(event.key, {
    ...state,
    onCard: event.target === event.currentTarget,
  });
  if (!shortcut) return;
  event.preventDefault();
  actions[shortcut]();
}

/**
 * A task or activity as a card on "Today" and in task lists. Checkbox and
 * start button sit in front; "Heute" and further actions appear on hover
 * and on keyboard focus. With the card focused, Space ticks it off, `S`
 * starts or stops it, `H` plans it for today and `D` opens the date.
 */
export function TaskCard({
  title,
  kind = "task",
  isDone = false,
  isRunning = false,
  isOverdue = false,
  project,
  labels = [],
  totalMinutes,
  activityInfo,
  dateLabel,
  isPlannedToday = false,
  onToggleDone,
  onActivityDone,
  onStart,
  onStop,
  onPlanToday,
  onDateClick,
  datePopover,
  actions,
  strings,
  formatDuration: format = formatDuration,
  className,
}: TaskCardProps) {
  const t = { ...taskCardStrings, ...strings };
  const [isDateOpen, setDateOpen] = useState(false);
  const { isActivity, done, running, showToday, showDate } = cardState({
    kind,
    isDone,
    isRunning,
    isPlannedToday,
    hasPlanToday: Boolean(onPlanToday),
    hasDate: [dateLabel, datePopover, onDateClick].some(Boolean),
  });

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    handleCardKey(
      event,
      {
        canToggleDone: isActivity
          ? Boolean(onActivityDone)
          : Boolean(onToggleDone),
        isDone: done,
        isRunning: running,
        canPlanToday: showToday,
        canOpenDate: showDate,
      },
      {
        toggleDone: () =>
          isActivity ? onActivityDone?.() : onToggleDone?.(!done),
        start: () => onStart?.(),
        stop: () => onStop?.(),
        planToday: () => onPlanToday?.(),
        openDate: () => (datePopover ? setDateOpen(true) : onDateClick?.()),
      },
    );

  const date = showDate && (
    <DateChip
      label={dateLabel}
      isOverdue={isOverdue}
      isRunning={running}
      popover={datePopover}
      isOpen={isDateOpen}
      onOpenChange={setDateOpen}
      onPress={onDateClick}
      t={t}
    />
  );

  return (
    // The card is one tab stop with its own keys (see `taskCardShortcut`).
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <div
      role="group"
      aria-label={title}
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
      aria-keyshortcuts={isActivity ? "S H D" : "Space S H D"}
      onKeyDown={onKeyDown}
      data-running={running || undefined}
      data-done={done || undefined}
      className={twMerge(
        "group/card outline-ring @container flex items-center gap-3 rounded-lg border px-4 py-3 shadow-sm outline-offset-2 focus-visible:outline-2",
        running
          ? "bg-running-soft border-running text-foreground"
          : "bg-card text-card-foreground border-border",
        className,
      )}
    >
      <Lead
        isActivity={isActivity}
        isDone={done}
        isRunning={running}
        onToggleDone={onToggleDone}
        onActivityDone={onActivityDone}
        onStart={onStart}
        onStop={onStop}
        t={t}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div
          className={twMerge(
            "text-body-strong [overflow-wrap:anywhere]",
            done && "text-muted-foreground line-through",
          )}
        >
          {title}
        </div>
        <Meta
          isRunning={running}
          activity={isActivity ? (activityInfo ?? "") : undefined}
          date={date || null}
          isOverdue={isOverdue}
          project={project}
          labels={labels}
          t={t}
        />
      </div>

      <Side
        onPlanToday={showToday ? onPlanToday : undefined}
        actions={actions}
        total={totalMinutes === undefined ? undefined : format(totalMinutes)}
        isRunning={running}
        t={t}
      />
    </div>
  );
}

/**
 * "Heute" and further actions, shown on hover and focus, and the total
 * time.
 */
function Side({
  onPlanToday,
  actions,
  total,
  isRunning,
  t,
}: {
  onPlanToday?: () => void;
  actions: React.ReactNode;
  total: string | undefined;
  isRunning: boolean;
  t: TaskCardStrings;
}) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {(onPlanToday ?? actions) && (
        <div className="flex items-center gap-1 opacity-0 group-focus-within/card:opacity-100 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100">
          {onPlanToday && (
            <Button
              variant="quiet"
              size="sm"
              onPress={onPlanToday}
              className={twMerge(
                "px-2 @max-md:aspect-square @max-md:px-0",
                isRunning
                  ? "text-foreground"
                  : "text-primary hover:text-accent-foreground pressed:text-accent-foreground",
              )}
            >
              <CalendarPlus aria-hidden />
              <span className="@max-md:sr-only">{t.planToday}</span>
            </Button>
          )}
          {actions}
        </div>
      )}
      {total !== undefined && (
        <span
          className={twMerge(
            "type-duration min-w-10 text-right",
            isRunning ? "text-running-text" : "text-muted-foreground",
          )}
        >
          <span className="sr-only">{t.total} </span>
          {total}
        </span>
      )}
    </div>
  );
}

/** The line under the title: state, project, labels and date. */
function Meta({
  isRunning,
  activity,
  date,
  isOverdue,
  project,
  labels,
  t,
}: {
  isRunning: boolean;
  /** The rule of an activity; undefined for a task. */
  activity: string | undefined;
  date: React.ReactNode;
  isOverdue: boolean;
  project: TaskCardProps["project"];
  labels: string[];
  t: TaskCardStrings;
}) {
  return (
    <div
      className={twMerge(
        "text-small flex flex-wrap items-center gap-2",
        isRunning ? "text-foreground" : "text-muted-foreground",
      )}
    >
      {isRunning && <LiveBadge>{t.running}</LiveBadge>}
      {activity !== undefined && (
        <span>
          {t.activity}
          {activity ? ` · ${activity}` : ""}
        </span>
      )}
      {isOverdue && date}
      {project && (
        <Chip color={project.color} title={project.name}>
          {project.name}
        </Chip>
      )}
      {labels.map((label) => (
        <Chip key={label} title={label}>
          {label}
        </Chip>
      ))}
      {!isOverdue && date}
    </div>
  );
}

/** Checkbox (or the activity mark) and the round start button. */
function Lead({
  isActivity,
  isDone,
  isRunning,
  onToggleDone,
  onActivityDone,
  onStart,
  onStop,
  t,
}: {
  isActivity: boolean;
  isDone: boolean;
  isRunning: boolean;
  onToggleDone?: (isDone: boolean) => void;
  onActivityDone?: () => void;
  onStart?: () => void;
  onStop?: () => void;
  t: TaskCardStrings;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      {isActivity && onActivityDone ? (
        <Button
          variant="quiet"
          size="sm"
          aria-label={t.activityDone}
          onPress={onActivityDone}
          className={twMerge(
            "size-5 rounded-sm p-0",
            isRunning ? "text-foreground" : "text-muted-foreground",
            "hover:text-primary",
          )}
        >
          <Repeat aria-hidden className="size-4" />
        </Button>
      ) : isActivity ? (
        <span
          title={t.activity}
          className={twMerge(
            "flex size-5 items-center justify-center",
            isRunning ? "text-foreground" : "text-muted-foreground",
          )}
        >
          <Repeat aria-hidden className="size-4" />
        </span>
      ) : (
        <Checkbox
          previewCheck
          aria-label={isDone ? t.reopen : t.markDone}
          isSelected={isDone}
          onChange={(selected) => onToggleDone?.(selected)}
          className={isDone ? "[&>div]:[--color:var(--color-success)]" : ""}
        />
      )}
      {!isDone && (
        <Button
          variant="quiet"
          aria-label={isRunning ? t.stop : t.start}
          onPress={isRunning ? onStop : onStart}
          className={twMerge(
            "size-7 rounded-full border-[1.5px] p-0 [&_svg]:fill-current",
            isRunning
              ? "bg-running border-running text-running-foreground hover:bg-running pressed:bg-running hover:opacity-90"
              : "bg-card border-input-border text-primary hover:bg-primary hover:border-primary hover:text-primary-foreground pressed:bg-primary pressed:text-primary-foreground",
          )}
        >
          {isRunning ? (
            <Square aria-hidden className="size-3" />
          ) : (
            <Play aria-hidden className="ml-0.5 size-3" />
          )}
        </Button>
      )}
    </div>
  );
}

/**
 * The date chip: dashed without a date, solid with one, red when overdue.
 * With a popover it opens it; otherwise it calls `onPress`.
 */
function DateChip({
  label,
  isOverdue,
  isRunning,
  popover,
  isOpen,
  onOpenChange,
  onPress,
  t,
}: {
  label: string | null | undefined;
  isOverdue: boolean;
  isRunning: boolean;
  popover: React.ReactNode;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPress?: () => void;
  t: TaskCardStrings;
}) {
  const state = isOverdue ? "overdue" : label ? "set" : "empty";
  const text = label ?? t.noDate;
  const button = (
    <RACButton
      aria-label={
        isOverdue ? `${t.date}: ${text}, ${t.overdue}` : `${t.date}: ${text}`
      }
      onPress={popover ? undefined : onPress}
      className={(renderProps) =>
        dateChip({ ...renderProps, state, onRunning: isRunning })
      }
    >
      {isOverdue ? <CalendarX2 aria-hidden /> : <Calendar aria-hidden />}
      {text}
    </RACButton>
  );
  if (!popover) return button;
  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={onOpenChange}>
      {button}
      {popover}
    </DialogTrigger>
  );
}
