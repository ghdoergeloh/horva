"use client";

import { ArrowLeftRight, Play, Square } from "lucide-react";

import type { FormatDuration } from "../lib/duration";
import type { ProjectColor } from "./Chip";
import { formatClock, formatDuration } from "../lib/duration";
import { twMerge } from "../lib/tw";
import { Button } from "./Button";
import { ProjectDot } from "./Chip";

/** The texts of the TimerBar. German by default. */
export interface TimerBarStrings {
  idle: string;
  start: string;
  switch: string;
  stop: string;
  today: string;
  week: string;
  /** Accessible name of the region. */
  region: string;
  /** Read out when work starts, before the task name. */
  running: string;
  noProject: string;
}

export const timerBarStrings: TimerBarStrings = {
  idle: "Nicht am Arbeiten",
  start: "Arbeit starten",
  switch: "Wechseln",
  stop: "Stopp",
  today: "Heute",
  week: "Woche",
  region: "Timer",
  running: "Läuft",
  noProject: "Ohne Projekt",
};

/** The slot that is running now. */
export interface RunningSlot {
  taskName: string;
  project?: { name: string; color: ProjectColor | null } | null;
  /** Seconds since the start. The app updates it; the bar has no timer. */
  elapsedSeconds: number;
}

export interface TimerBarProps {
  /** The running slot, or nothing when no work is running. */
  running?: RunningSlot | null;
  /** Time worked today and this week, in minutes. */
  todayMinutes?: number;
  weekMinutes?: number;
  onStart?: () => void;
  onSwitch?: () => void;
  onStop?: () => void;
  strings?: Partial<TimerBarStrings>;
  formatDuration?: FormatDuration;
  className?: string;
}

/**
 * The bar at the top of the main area. It always shows whether work is
 * running, and on what. Only a change of state is announced; the ticking
 * time is outside the live region. Below 448 px of width the sums are
 * hidden and the buttons show only their icon.
 */
export function TimerBar({
  running,
  todayMinutes,
  weekMinutes,
  onStart,
  onSwitch,
  onStop,
  strings,
  formatDuration: format = formatDuration,
  className,
}: TimerBarProps) {
  const t = { ...timerBarStrings, ...strings };
  const isRunning = Boolean(running);
  const sums = [
    todayMinutes === undefined ? null : `${t.today} ${format(todayMinutes)}`,
    weekMinutes === undefined || isRunning
      ? null
      : `${t.week} ${format(weekMinutes)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-label={t.region}
      data-running={isRunning || undefined}
      className={twMerge(
        "@container rounded-lg border shadow-sm",
        isRunning
          ? "bg-running-soft border-running text-foreground"
          : "bg-card text-card-foreground border-border",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-4 px-4 py-3 @max-md:gap-3 @max-md:px-3">
        <span
          aria-hidden
          className={twMerge(
            "size-3 shrink-0 rounded-full",
            isRunning
              ? "bg-running ring-card motion-safe:animate-running-pulse ring-4"
              : "bg-project-none",
          )}
        />
        <div role="status" className="min-w-0 flex-1">
          <div
            className="text-heading truncate"
            title={running ? running.taskName : undefined}
          >
            {running ? (
              <>
                <span className="sr-only">{t.running}: </span>
                {running.taskName}
              </>
            ) : (
              t.idle
            )}
          </div>
          <div className="text-small flex min-w-0 items-center gap-2">
            {running ? (
              <>
                <ProjectDot color={running.project?.color ?? null} />
                <span className="truncate">
                  {running.project?.name ?? t.noProject}
                </span>
              </>
            ) : (
              sums && (
                <span className="text-muted-foreground truncate @max-md:hidden">
                  {sums}
                </span>
              )
            )}
          </div>
        </div>
        {running && (
          <div className="shrink-0 text-right">
            <div className="type-timer text-running-text @max-md:text-xl @max-md:leading-7">
              {formatClock(running.elapsedSeconds)}
            </div>
            {sums && (
              <div className="type-duration-small text-foreground @max-md:hidden">
                {sums}
              </div>
            )}
          </div>
        )}
        <div className="flex shrink-0 gap-2">
          {running ? (
            <>
              <Button
                variant="secondary"
                onPress={onSwitch}
                className="@max-md:aspect-square @max-md:px-0"
              >
                <ArrowLeftRight aria-hidden />
                <span className="@max-md:sr-only">{t.switch}</span>
              </Button>
              <Button variant="secondary" aria-label={t.stop} onPress={onStop}>
                <Square aria-hidden />
              </Button>
            </>
          ) : (
            <Button
              onPress={onStart}
              className="@max-md:aspect-square @max-md:px-0"
            >
              <Play aria-hidden />
              <span className="@max-md:sr-only">{t.start}</span>
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
