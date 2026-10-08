"use client";

import type React from "react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { Table2 } from "lucide-react";

import type { ProjectColor } from "./Chip";
import type { DayEntry, StackPart } from "./HoursPerDay.data";
import type { ChartKey } from "./ProjectDonut.data";
import type { FormatDuration } from "./TimerBar.format";
import { twMerge } from "../lib/tw";
import { Button } from "./Button";
import { ProjectDot, projectColorValue } from "./Chip";
import {
  dayTotal,
  DENSE_DAYS,
  hourAxis,
  projectMinutes,
  stackDay,
  weekStarts,
} from "./HoursPerDay.data";
import { ChartTooltip } from "./ProjectDonut.tooltip";
import { formatDuration } from "./TimerBar.format";

/** The texts of HoursPerDay. German by default. */
export interface HoursPerDayStrings {
  title: string;
  target: string;
  showTable: string;
  hideTable: string;
  /** Accessible name of the table area. */
  table: string;
  day: string;
  total: string;
  /** Unit after a duration in the tooltip. */
  hoursShort: string;
  /** Unit after the hours on the y axis. */
  axisUnit: string;
  empty: string;
}

export const hoursPerDayStrings: HoursPerDayStrings = {
  title: "Stunden je Tag",
  target: "Soll",
  showTable: "Tabelle anzeigen",
  hideTable: "Tabelle ausblenden",
  table: "Stunden je Tag als Tabelle",
  day: "Tag",
  total: "Summe",
  hoursShort: "h",
  axisUnit: "h",
  empty: "Keine Zeiten in diesem Zeitraum",
};

/** A project in the legend. The legend order is the stack order. */
export interface ChartProject {
  id: ChartKey;
  name: string;
  color: ProjectColor | null;
}

export interface HoursPerDayProps {
  projects: ChartProject[];
  days: DayEntry[];
  /** Target per day, drawn as a dashed line. */
  targetMinutes?: number;
  /** @default 3 */
  headingLevel?: 2 | 3 | 4;
  strings?: Partial<HoursPerDayStrings>;
  formatDuration?: FormatDuration;
  className?: string;
}

const HEIGHT = 240;
const PAD_LEFT = 36;
const PAD_TOP = 18;
const PAD_BOTTOM = 24;
const GAP = 2;

/** Width of the element, updated when it changes. */
function useWidth(fallback: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => {
      if (element.clientWidth > 0) setWidth(element.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

interface Cell {
  day: number;
  part: StackPart;
  index: number;
}

/**
 * Hours per day as columns, stacked by project, with a dashed target line.
 * Hover or focus on a segment or a legend entry dims the other projects
 * and shows a tooltip. The segments form one tab stop: Left and Right move
 * between days, Up and Down within a column. From 15 days on the columns
 * lose their sums and weeks get a separator. "Tabelle anzeigen" shows the
 * values as a table.
 */
export function HoursPerDay({
  projects,
  days,
  targetMinutes,
  headingLevel = 3,
  strings,
  formatDuration: format = formatDuration,
  className,
}: HoursPerDayProps) {
  const t = { ...hoursPerDayStrings, ...strings };
  const headingId = useId();
  const tableId = useId();
  const [plotRef, width] = useWidth(560);
  const [hoverKey, setHoverKey] = useState<ChartKey | null>(null);
  const [focused, setFocused] = useState<Cell | null>(null);
  const [hovered, setHovered] = useState<Cell | null>(null);
  const [tabCell, setTabCell] = useState(0);
  const [showTable, setShowTable] = useState(false);
  const rects = useRef<(SVGRectElement | null)[]>([]);

  const order = projects.map((project) => project.id);
  const byId = new Map(projects.map((project) => [project.id, project]));
  const stacks = days.map((day) => stackDay(day.minutes, order));
  const totals = days.map(dayTotal);
  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  const axis = hourAxis(Math.max(0, ...totals), targetMinutes ?? 0);
  const dense = days.length >= DENSE_DAYS;
  const weeks = new Set(weekStarts(days.map((day) => day.date)));

  const plotWidth = Math.max(width - PAD_LEFT, 1);
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const slot = plotWidth / Math.max(days.length, 1);
  const barWidth = Math.max(4, Math.min(44, slot * 0.6));
  const y = (minutes: number) =>
    PAD_TOP + plotHeight * (1 - minutes / axis.max);
  const slotCenter = (day: number) => PAD_LEFT + slot * (day + 0.5);

  const cells: Cell[] = [];
  stacks.forEach((parts, day) =>
    parts.forEach((part) => cells.push({ day, part, index: cells.length })),
  );

  const activeKey =
    hoverKey ?? hovered?.part.projectId ?? focused?.part.projectId ?? null;
  const tipCell = hovered ?? focused;

  const hours = (minutes: number) => `${format(minutes)} ${t.hoursShort}`;
  const dayName = (day: number) =>
    days[day]?.fullLabel ?? days[day]?.label ?? "";
  const projectName = (id: ChartKey) => byId.get(id)?.name ?? String(id);

  const moveTo = (cell: Cell | undefined) => {
    if (!cell) return;
    setTabCell(cell.index);
    rects.current[cell.index]?.focus();
  };

  const onKeyDown = (event: React.KeyboardEvent, cell: Cell) => {
    const column = (day: number) => cells.filter((c) => c.day === day);
    const sideways = (direction: 1 | -1) => {
      for (
        let day = cell.day + direction;
        day >= 0 && day < days.length;
        day += direction
      ) {
        const target = column(day);
        if (target.length === 0) continue;
        const own = column(cell.day).indexOf(cell);
        return (
          target.find((c) => c.part.projectId === cell.part.projectId) ??
          target[Math.min(own, target.length - 1)]
        );
      }
      return undefined;
    };
    const handlers: Record<string, () => Cell | undefined> = {
      ArrowRight: () => sideways(1),
      ArrowLeft: () => sideways(-1),
      ArrowUp: () =>
        cells[cell.index + 1]?.day === cell.day
          ? cells[cell.index + 1]
          : undefined,
      ArrowDown: () =>
        cells[cell.index - 1]?.day === cell.day
          ? cells[cell.index - 1]
          : undefined,
      Home: () => cells[0],
      End: () => cells[cells.length - 1],
    };
    const handler = handlers[event.key];
    if (!handler) return;
    event.preventDefault();
    moveTo(handler());
  };

  const Heading = `h${String(headingLevel)}` as "h3";
  const tipRect = tipCell && {
    x: slotCenter(tipCell.day),
    y: y(tipCell.part.to),
  };

  return (
    <section
      aria-labelledby={headingId}
      className={twMerge(
        "bg-card text-card-foreground border-border rounded-lg border p-4",
        className,
      )}
    >
      <Heading id={headingId} className="text-heading mb-3">
        {t.title}
      </Heading>
      <ul className="text-small mb-3 flex flex-wrap gap-x-4 gap-y-1">
        {projects.map((project) => (
          <li
            key={String(project.id)}
            className="flex min-w-0 items-center gap-1.5"
            onMouseEnter={() => setHoverKey(project.id)}
            onMouseLeave={() => setHoverKey(null)}
          >
            <ProjectDot
              color={project.color}
              className={twMerge(
                "motion-safe:transition-opacity",
                activeKey !== null && activeKey !== project.id && "opacity-35",
              )}
            />
            <span className="max-w-48 truncate" title={project.name}>
              {project.name}
            </span>
          </li>
        ))}
      </ul>
      {grandTotal === 0 && (
        <p className="text-body text-foreground mb-2">{t.empty}</p>
      )}
      <div ref={plotRef} className="relative">
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${String(width)} ${String(HEIGHT)}`}
          role="group"
          aria-label={t.title}
          className="block overflow-visible"
        >
          {axis.ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PAD_LEFT}
                x2={width}
                y1={y(tick)}
                y2={y(tick)}
                strokeWidth={1}
                className="stroke-border"
              />
              <text
                x={PAD_LEFT - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-muted-foreground font-mono text-xs font-medium"
              >
                {`${String(tick / 60)}${t.axisUnit}`}
              </text>
            </g>
          ))}
          {dense &&
            [...weeks].map((day) => (
              <line
                key={`week-${String(day)}`}
                x1={PAD_LEFT + slot * day}
                x2={PAD_LEFT + slot * day}
                y1={PAD_TOP}
                y2={HEIGHT - PAD_BOTTOM + 6}
                strokeWidth={1}
                strokeDasharray="3 3"
                className="stroke-input-border"
              />
            ))}
          {targetMinutes !== undefined && targetMinutes > 0 && (
            <g>
              <line
                x1={PAD_LEFT}
                x2={width}
                y1={y(targetMinutes)}
                y2={y(targetMinutes)}
                strokeWidth={1.5}
                strokeDasharray="4 4"
                className="stroke-foreground opacity-60"
              />
              <text
                x={width}
                y={y(targetMinutes) - 6}
                textAnchor="end"
                className="fill-muted-foreground font-sans text-[11px] font-medium"
              >
                {`${t.target} ${format(targetMinutes)}`}
              </text>
            </g>
          )}
          {cells.map((cell) => {
            const { part, day } = cell;
            const top = y(part.to);
            const bottom = y(part.from) - (part.from > 0 ? GAP : 0);
            const project = byId.get(part.projectId);
            const isActive = activeKey === part.projectId;
            return (
              <rect
                key={cell.index}
                ref={(element) => {
                  rects.current[cell.index] = element;
                }}
                x={slotCenter(day) - barWidth / 2}
                y={top}
                width={barWidth}
                height={Math.max(bottom - top, 1)}
                rx={3}
                fill={projectColorValue(project?.color ?? null)}
                role="img"
                aria-label={`${projectName(part.projectId)}, ${dayName(day)}: ${hours(part.minutes)}`}
                tabIndex={cell.index === tabCell ? 0 : -1}
                className={twMerge(
                  "outline-ring outline-offset-2 focus-visible:outline-2 motion-safe:transition-opacity",
                  activeKey !== null && !isActive && "opacity-35",
                )}
                onMouseEnter={() => setHovered(cell)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => {
                  setTabCell(cell.index);
                  setFocused(cell);
                }}
                onBlur={() => setFocused(null)}
                onKeyDown={(event) => onKeyDown(event, cell)}
              />
            );
          })}
          {days.map((day, index) => {
            const showLabel = !dense || index === 0 || weeks.has(index);
            const total = totals[index] ?? 0;
            return (
              <g key={day.date}>
                {showLabel && (
                  <text
                    x={dense ? PAD_LEFT + slot * index + 2 : slotCenter(index)}
                    y={HEIGHT - 6}
                    textAnchor={dense ? "start" : "middle"}
                    className="fill-muted-foreground font-mono text-xs font-medium"
                  >
                    {day.label}
                  </text>
                )}
                {!dense && total > 0 && (
                  <text
                    x={slotCenter(index)}
                    y={y(total) - 6}
                    textAnchor="middle"
                    className="fill-foreground font-mono text-xs font-medium"
                  >
                    {format(total)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {tipCell && tipRect && (
          <ChartTooltip
            x={Math.min(Math.max(tipRect.x, 60), width - 60)}
            y={tipRect.y}
            title={projectName(tipCell.part.projectId)}
            lines={[dayName(tipCell.day), hours(tipCell.part.minutes)]}
          />
        )}
      </div>
      <Button
        variant="quiet"
        size="sm"
        aria-expanded={showTable}
        aria-controls={tableId}
        onPress={() => setShowTable((open) => !open)}
        className="mt-2"
      >
        <Table2 aria-hidden />
        {showTable ? t.hideTable : t.showTable}
      </Button>
      <HoursTable
        id={tableId}
        isOpen={showTable}
        projects={projects}
        days={days}
        totals={totals}
        format={format}
        t={t}
      />
    </section>
  );
}

/** The values of the chart as a table, below the "Tabelle anzeigen" button. */
function HoursTable({
  id,
  isOpen,
  projects,
  days,
  totals,
  format,
  t,
}: {
  id: string;
  isOpen: boolean;
  projects: ChartProject[];
  days: DayEntry[];
  totals: number[];
  format: FormatDuration;
  t: HoursPerDayStrings;
}) {
  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  const dayName = (index: number) =>
    days[index]?.fullLabel ?? days[index]?.label ?? "";
  return (
    <div
      id={id}
      hidden={!isOpen}
      role="region"
      aria-label={t.table}
      // A wide table scrolls; the keyboard needs to reach it.
      // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={isOpen ? 0 : undefined}
      className="outline-ring mt-2 overflow-x-auto rounded-md outline-offset-2 focus-visible:outline-2"
    >
      <table className="text-small w-full border-collapse">
        <thead>
          <tr className="border-border border-b">
            <th scope="col" className="py-1.5 pr-3 text-left font-medium">
              {t.day}
            </th>
            {projects.map((project) => (
              <th
                key={String(project.id)}
                scope="col"
                className="px-2 py-1.5 text-right align-bottom font-medium"
              >
                <span className="inline-flex items-center justify-end gap-1.5">
                  <ProjectDot color={project.color} size="sm" />
                  {project.name}
                </span>
              </th>
            ))}
            <th scope="col" className="py-1.5 pl-3 text-right font-medium">
              {t.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {days.map((day, index) => (
            <tr key={day.date} className="border-border border-b">
              <th
                scope="row"
                className="py-1.5 pr-3 text-left font-normal whitespace-nowrap"
              >
                {dayName(index)}
              </th>
              {projects.map((project) => {
                const minutes = projectMinutes(day, project.id);
                return (
                  <td
                    key={String(project.id)}
                    className="type-duration-small px-2 py-1.5 text-right"
                  >
                    {minutes > 0 ? format(minutes) : ""}
                  </td>
                );
              })}
              <td className="type-duration-small py-1.5 pl-3 text-right">
                {format(totals[index] ?? 0)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="py-1.5 pr-3 text-left font-medium">
              {t.total}
            </th>
            {projects.map((project) => (
              <td
                key={String(project.id)}
                className="type-duration-small px-2 py-1.5 text-right"
              >
                {format(
                  days.reduce(
                    (sum, day) => sum + projectMinutes(day, project.id),
                    0,
                  ),
                )}
              </td>
            ))}
            <td className="type-duration-small py-1.5 pl-3 text-right">
              {format(grandTotal)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
