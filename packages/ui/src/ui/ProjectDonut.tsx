"use client";

import type React from "react";
import { useId, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";

import { focusRing } from "@horva/ui";

import type { ChartKey, DonutSlice, ProjectShare } from "./ProjectDonut.data";
import type { FormatDuration } from "./TimerBar.format";
import { twMerge } from "../lib/tw";
import { ProjectDot, projectColorValue } from "./Chip";
import {
  arcPath,
  donutArcs,
  donutSlices,
  OTHERS_KEY,
  polar,
} from "./ProjectDonut.data";
import { ChartTooltip } from "./ProjectDonut.tooltip";
import { formatDuration, formatPercent } from "./TimerBar.format";

/** The texts of the ProjectDonut. German by default. */
export interface ProjectDonutStrings {
  title: string;
  /** Under the total in the middle of the ring. */
  hours: string;
  /** Unit after a duration in the legend and the tooltip. */
  hoursShort: string;
  others: string;
  empty: string;
}

export const projectDonutStrings: ProjectDonutStrings = {
  title: "Projektanteile",
  hours: "Stunden",
  hoursShort: "h",
  others: "Weitere",
  empty: "Keine Zeiten in diesem Zeitraum",
};

export interface ProjectDonutProps {
  /** Time per project in the period; the order does not matter. */
  projects: ProjectShare[];
  /** From this many projects on, the smallest become "Others". @default 8 */
  maxProjects?: number;
  /** @default 3 */
  headingLevel?: 2 | 3 | 4;
  strings?: Partial<ProjectDonutStrings>;
  formatDuration?: FormatDuration;
  className?: string;
}

const SIZE = 180;
const CENTER = SIZE / 2;
const RADIUS = 70;
const WIDTH = 22;
const WIDTH_ACTIVE = 28;

/**
 * Project shares of a period as a ring with the total in the middle and a
 * linked legend. Hover or focus on a segment or a legend row highlights
 * both and dims the rest. The segments form one tab stop; the arrow keys
 * move between them.
 */
export function ProjectDonut({
  projects,
  maxProjects = 8,
  headingLevel = 3,
  strings,
  formatDuration: format = formatDuration,
  className,
}: ProjectDonutProps) {
  const t = { ...projectDonutStrings, ...strings };
  const headingId = useId();
  const slices = donutSlices(projects, {
    maxProjects,
    othersLabel: t.others,
  });
  const total = slices.reduce((sum, slice) => sum + slice.minutes, 0);
  const arcs = donutArcs(slices.map((slice) => slice.minutes));

  const [hoverKey, setHoverKey] = useState<ChartKey | null>(null);
  const [focusKey, setFocusKey] = useState<ChartKey | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [othersOpen, setOthersOpen] = useState(false);
  const segments = useRef<(SVGPathElement | null)[]>([]);
  const activeKey = hoverKey ?? focusKey;
  const activeIndex = slices.findIndex((slice) => slice.id === activeKey);
  const active = slices[activeIndex];
  const activeArc = arcs[activeIndex];

  const hours = (minutes: number) => `${format(minutes)} ${t.hoursShort}`;
  const label = (slice: DonutSlice) =>
    `${slice.name}: ${hours(slice.minutes)}, ${formatPercent(slice.percent)}`;

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const last = slices.length - 1;
    const next = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowDown: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setTabIndex(next);
    segments.current[next]?.focus();
  };

  const Heading = `h${String(headingLevel)}` as "h3";
  const tip =
    active && activeArc
      ? polar(
          CENTER,
          CENTER,
          RADIUS + 16,
          (activeArc.start + activeArc.end) / 2,
        )
      : null;

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
      <div className="flex flex-wrap items-center gap-6">
        <div className="relative shrink-0">
          <svg
            width={SIZE}
            height={SIZE}
            viewBox={`0 0 ${String(SIZE)} ${String(SIZE)}`}
            role="group"
            aria-label={`${t.title}, ${format(total)} ${t.hours}`}
            className="block"
          >
            {slices.length === 0 && (
              <circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS}
                fill="none"
                strokeWidth={WIDTH}
                className="stroke-muted"
              />
            )}
            {slices.map((slice, index) => {
              const arc = arcs[index];
              if (!arc) return null;
              const isActive = slice.id === activeKey;
              return (
                <path
                  key={String(slice.id)}
                  ref={(element) => {
                    segments.current[index] = element;
                  }}
                  d={arcPath(CENTER, CENTER, RADIUS, arc)}
                  role="img"
                  aria-label={label(slice)}
                  tabIndex={index === tabIndex ? 0 : -1}
                  fill="none"
                  stroke={projectColorValue(slice.color)}
                  strokeWidth={isActive ? WIDTH_ACTIVE : WIDTH}
                  data-key={String(slice.id)}
                  className={twMerge(
                    "outline-none motion-safe:transition-[opacity,stroke-width]",
                    activeKey !== null && !isActive && "opacity-35",
                  )}
                  onMouseEnter={() => setHoverKey(slice.id)}
                  onMouseLeave={() => setHoverKey(null)}
                  onFocus={() => {
                    setTabIndex(index);
                    setFocusKey(slice.id);
                  }}
                  onBlur={() => setFocusKey(null)}
                  onKeyDown={(event) => onKeyDown(event, index)}
                />
              );
            })}
            {slices.length > 1 &&
              arcs.map((arc, index) => {
                const inner = polar(CENTER, CENTER, RADIUS - 16, arc.start);
                const outer = polar(CENTER, CENTER, RADIUS + 16, arc.start);
                return (
                  <line
                    key={index}
                    x1={inner.x}
                    y1={inner.y}
                    x2={outer.x}
                    y2={outer.y}
                    strokeWidth={2}
                    className="stroke-card pointer-events-none"
                  />
                );
              })}
            {focusKey !== null && activeArc && focusKey === activeKey && (
              <path
                d={arcPath(
                  CENTER,
                  CENTER,
                  RADIUS + WIDTH_ACTIVE / 2 + 3,
                  activeArc,
                )}
                fill="none"
                strokeWidth={2}
                className="stroke-ring pointer-events-none"
              />
            )}
            <text
              x={CENTER}
              y={CENTER + 2}
              textAnchor="middle"
              className="fill-foreground font-mono text-[22px] font-medium tabular-nums"
            >
              {format(total)}
            </text>
            <text
              x={CENTER}
              y={CENTER + 22}
              textAnchor="middle"
              className="fill-muted-foreground font-sans text-xs"
            >
              {t.hours}
            </text>
          </svg>
          {active && tip && (
            <ChartTooltip
              x={tip.x}
              y={tip.y}
              title={active.name}
              lines={[formatPercent(active.percent), hours(active.minutes)]}
            />
          )}
        </div>
        {slices.length === 0 ? (
          <p className="text-body text-foreground min-w-48 flex-1">{t.empty}</p>
        ) : (
          <ul className="flex min-w-56 flex-1 flex-col gap-0.5">
            {slices.map((slice) => (
              <LegendRow
                key={String(slice.id)}
                slice={slice}
                total={total}
                isActive={slice.id === activeKey}
                isDimmed={activeKey !== null && slice.id !== activeKey}
                isOpen={othersOpen}
                onToggle={() => setOthersOpen((open) => !open)}
                onActive={(isActive) => setHoverKey(isActive ? slice.id : null)}
                onFocusChange={(isFocused) =>
                  setFocusKey(isFocused ? slice.id : null)
                }
                hours={hours}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

const rowGrid =
  "grid grid-cols-[12px_minmax(0,1fr)_auto_40px] items-center gap-2 rounded-md px-2 py-1.5";

function LegendRow({
  slice,
  total,
  isActive,
  isDimmed,
  isOpen,
  onToggle,
  onActive,
  onFocusChange,
  hours,
}: {
  slice: DonutSlice;
  total: number;
  isActive: boolean;
  isDimmed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onActive: (isActive: boolean) => void;
  onFocusChange: (isFocused: boolean) => void;
  hours: (minutes: number) => string;
}) {
  const isOthers = slice.id === OTHERS_KEY;
  const panelId = useId();
  const content = (
    <>
      <ProjectDot
        color={slice.color}
        className={twMerge(
          "size-3 motion-safe:transition-opacity",
          isDimmed && "opacity-35",
        )}
      />
      <span className="text-body flex min-w-0 items-center gap-1">
        <span className="truncate" title={slice.name}>
          {slice.name}
        </span>
        {isOthers && (
          <ChevronRight
            aria-hidden
            className={twMerge(
              "size-4 shrink-0 motion-safe:transition-transform",
              isOpen && "rotate-90",
            )}
          />
        )}
      </span>
      <span className="type-duration text-right">{hours(slice.minutes)}</span>
      <span
        className={twMerge(
          "type-duration-small text-right",
          isActive ? "text-accent-foreground" : "text-muted-foreground",
        )}
      >
        {formatPercent(slice.percent)}
      </span>
    </>
  );
  const highlight = isActive ? "bg-accent text-accent-foreground" : "";
  return (
    <li
      onMouseEnter={() => onActive(true)}
      onMouseLeave={() => onActive(false)}
    >
      {isOthers ? (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          onFocus={() => onFocusChange(true)}
          onBlur={() => onFocusChange(false)}
          className={twMerge(
            rowGrid,
            focusRing({ isFocusVisible: false }),
            "focus-visible:outline-2 w-full cursor-default text-left",
            highlight,
          )}
        >
          {content}
        </button>
      ) : (
        <div className={twMerge(rowGrid, highlight)}>{content}</div>
      )}
      {isOthers && (
        <ul id={panelId} hidden={!isOpen} className="ml-5 flex flex-col">
          {slice.grouped.map((project) => (
            <li key={String(project.id)} className={rowGrid}>
              <ProjectDot color={project.color} />
              <span className="text-small truncate" title={project.name}>
                {project.name}
              </span>
              <span className="type-duration-small text-right">
                {hours(project.minutes)}
              </span>
              <span className="type-duration-small text-muted-foreground text-right">
                {formatPercent(total > 0 ? (project.minutes / total) * 100 : 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
