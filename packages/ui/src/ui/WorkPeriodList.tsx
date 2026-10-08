"use client";

import type { Key } from "react-aria-components";
import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

import type { ProjectColor } from "./Chip";
import { twMerge } from "../lib/tw";
import { Button } from "./Button";
import { LiveBadge, ProjectDot } from "./Chip";
import { formatClock, formatDuration, minutesBetween } from "./DayBarsModel";
import {
  dayCopyText,
  periodCopyText,
  sumPeriods,
  withBreaks,
} from "./WorkPeriodListModel";

export { dayCopyText, periodCopyText } from "./WorkPeriodListModel";

/** A period of contiguous slots, merged whatever their task. */
export interface WorkPeriod {
  id: Key;
  start: Date;
  /** `null` while the last slot of the period runs. */
  end: Date | null;
  /** How many slots the period holds. */
  slotCount: number;
  /** The projects of its slots, each once. */
  projects: readonly { id: Key; name: string; color: ProjectColor | null }[];
}

/** All texts of the work period list. Each one has a German default. */
export interface WorkPeriodListLabels {
  from: string;
  to: string;
  duration: string;
  content: string;
  actions: string;
  /** The end of a running period. */
  now: string;
  slots: (count: number) => string;
  break: string;
  /** The name of the copy button of a period. */
  copyPeriod: (text: string) => string;
  copyDay: string;
  /** Announced after copying. */
  copied: string;
  /** Shown when `onCopy` rejects. */
  copyFailed: string;
  workTime: string;
  breakTotal: (duration: string) => string;
  empty: string;
}

const defaultLabels: WorkPeriodListLabels = {
  from: "Von",
  to: "Bis",
  duration: "Dauer",
  content: "Enthält",
  actions: "Aktionen",
  now: "jetzt",
  slots: (count) => (count === 1 ? "1 Slot" : `${String(count)} Slots`),
  break: "Pause",
  copyPeriod: (text) => `Zeitraum ${text} kopieren`,
  copyDay: "Tag kopieren",
  copied: "Kopiert",
  copyFailed: "Kopieren fehlgeschlagen.",
  workTime: "Arbeitszeit",
  breakTotal: (duration) => `Pause ${duration}`,
  empty: "Keine Arbeitszeiten an diesem Tag.",
};

export interface WorkPeriodListProps {
  /** The periods of one day, merged by the app. */
  periods: readonly WorkPeriod[];
  /** The current time: the end of a running period. */
  now: Date;
  /**
   * Puts the text on the clipboard, such as `09:20–12:02` for a period
   * or `09:20–12:02, 13:05–18:12` for the day.
   */
  onCopy: (text: string) => void | Promise<void>;
  labels?: Partial<WorkPeriodListLabels>;
  className?: string;
}

const cell = "border-border border-b px-2 py-1.75 align-middle";
const timeCell = twMerge(cell, "w-px font-mono tabular-nums whitespace-nowrap");
const durationCell = twMerge(
  cell,
  "text-muted-foreground w-px text-right font-mono tabular-nums whitespace-nowrap",
);
const actionCell = twMerge(cell, "w-px py-1 text-right whitespace-nowrap");
const DAY = "day";

/**
 * The work periods of one day (#76): from, to, duration and what each one
 * holds, with the breaks between them as quiet rows. Each period and the
 * whole day can be copied as text, for a separate time sheet. The foot
 * shows the working time and the sum of the breaks.
 */
export function WorkPeriodList({
  periods,
  now,
  onCopy,
  labels: labelOverrides,
  className,
}: WorkPeriodListProps) {
  const labels = { ...defaultLabels, ...labelOverrides };
  const [copied, setCopied] = useState<Key | null>(null);
  const [failed, setFailed] = useState(false);
  const totals = sumPeriods(periods, now);

  useEffect(() => {
    if (copied === null) return;
    const timer = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy(key: Key, text: string) {
    setCopied(null);
    setFailed(false);
    try {
      await onCopy(text);
      setCopied(key);
    } catch {
      setFailed(true);
    }
  }

  const copyIcon = (key: Key) =>
    copied === key ? <Check aria-hidden /> : <Copy aria-hidden />;

  return (
    <div className={twMerge("@container font-sans", className)}>
      <table className="text-body text-foreground w-full border-collapse">
        <thead>
          <tr className="text-caption text-muted-foreground text-left">
            <th className={twMerge(cell, "py-1.5 font-medium")}>
              {labels.from}
            </th>
            <th className={twMerge(cell, "py-1.5 font-medium")}>{labels.to}</th>
            <th className={twMerge(cell, "py-1.5 text-right font-medium")}>
              {labels.duration}
            </th>
            <th className={twMerge(cell, "w-full py-1.5 font-medium")}>
              {labels.content}
            </th>
            <th className={twMerge(cell, "py-1.5")}>
              <span className="sr-only">{labels.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {periods.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className={twMerge(
                  cell,
                  "text-muted-foreground text-small py-3",
                )}
              >
                {labels.empty}
              </td>
            </tr>
          )}
          {withBreaks(periods, now).map((row) => {
            if (row.kind === "break")
              return (
                <tr
                  key={`break:${String(row.start.getTime())}`}
                  className="text-muted-foreground italic"
                >
                  <td className={twMerge(timeCell, "py-0.75")}>
                    {formatClock(row.start)}
                  </td>
                  <td className={twMerge(timeCell, "py-0.75")}>
                    {formatClock(row.end)}
                  </td>
                  <td className={twMerge(durationCell, "py-0.75")}>
                    {formatDuration(minutesBetween(row.start, row.end))}
                  </td>
                  <td colSpan={2} className={twMerge(cell, "py-0.75")}>
                    {labels.break}
                  </td>
                </tr>
              );
            const { period } = row;
            const isRunning = period.end === null;
            const text = periodCopyText(period, now);
            return (
              <tr key={`period:${String(period.id)}`}>
                <td className={timeCell}>{formatClock(period.start)}</td>
                <td className={timeCell}>
                  {period.end ? (
                    formatClock(period.end)
                  ) : (
                    <LiveBadge>{labels.now}</LiveBadge>
                  )}
                </td>
                <td
                  className={twMerge(
                    durationCell,
                    isRunning && "text-running-text",
                  )}
                >
                  {formatDuration(
                    minutesBetween(period.start, period.end ?? now),
                  )}
                </td>
                <td
                  className={twMerge(cell, "text-muted-foreground text-small")}
                >
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span>{labels.slots(period.slotCount)}</span>
                    {period.projects.map((project) => (
                      <span
                        key={project.id}
                        className="inline-flex items-center gap-1.5"
                      >
                        <ProjectDot color={project.color} size="sm" />
                        {project.name}
                      </span>
                    ))}
                  </span>
                </td>
                <td className={actionCell}>
                  <Button
                    variant="quiet"
                    size="sm"
                    aria-label={labels.copyPeriod(text)}
                    onPress={() => void copy(period.id, text)}
                  >
                    {copyIcon(period.id)}
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
        {periods.length > 0 && (
          <tfoot>
            <tr>
              <td colSpan={2} className="px-2 py-2 font-semibold">
                {labels.workTime}
              </td>
              <td className="type-duration px-2 py-2 text-right font-semibold">
                {formatDuration(totals.work)}
              </td>
              <td className="text-muted-foreground text-small px-2 py-2">
                {totals.breaks > 0 &&
                  labels.breakTotal(formatDuration(totals.breaks))}
              </td>
              <td className="px-2 py-2 text-right whitespace-nowrap">
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => void copy(DAY, dayCopyText(periods, now))}
                >
                  {copyIcon(DAY)}
                  {labels.copyDay}
                </Button>
              </td>
            </tr>
          </tfoot>
        )}
      </table>
      {failed && (
        <p
          role="alert"
          className="text-destructive text-caption px-2 pt-1.5 font-normal"
        >
          {labels.copyFailed}
        </p>
      )}
      <span role="status" className="sr-only">
        {copied !== null ? labels.copied : ""}
      </span>
    </div>
  );
}
