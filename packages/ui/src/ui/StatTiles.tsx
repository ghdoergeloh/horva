import type React from "react";

import type { ProjectColor } from "./Chip";
import type { FormatDuration } from "./TimerBar.format";
import { twMerge } from "../lib/tw";
import { ProjectDot } from "./Chip";
import { formatDuration, formatSignedDuration } from "./TimerBar.format";

/**
 * One key figure. The value is a project (`project`), a duration
 * (`minutes`) or a ready text (`value`), checked in this order.
 */
export interface StatTile {
  id: string;
  label: string;
  project?: { name: string; color: ProjectColor | null };
  minutes?: number;
  value?: string;
  /** Small unit after the value; `h` for durations by default. */
  unit?: string;
  /** One line below the value. Built from `targetMinutes` when missing. */
  context?: React.ReactNode;
  /** The target for a duration; the line shows it and the difference. */
  targetMinutes?: number;
}

/** The texts of the StatTiles. German by default. */
export interface StatTilesStrings {
  target: string;
  hours: string;
  /** Shown when a tile has no value. */
  noValue: string;
}

export const statTilesStrings: StatTilesStrings = {
  target: "Soll",
  hours: "h",
  noValue: "–",
};

export interface StatTilesProps {
  tiles: StatTile[];
  strings?: Partial<StatTilesStrings>;
  formatDuration?: FormatDuration;
  className?: string;
}

/**
 * Key figures above the report charts: total, average per work day,
 * largest project, time without a task. Values in Geist Mono, never in
 * colors for good or bad; differences as numbers with a sign. The tiles
 * fill the row and drop to two columns at 400 px.
 */
export function StatTiles({
  tiles,
  strings,
  formatDuration: format = formatDuration,
  className,
}: StatTilesProps) {
  const t = { ...statTilesStrings, ...strings };
  return (
    <dl
      className={twMerge(
        "grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3",
        className,
      )}
    >
      {tiles.map((tile) => {
        const context =
          tile.context ??
          (tile.targetMinutes !== undefined && tile.minutes !== undefined
            ? `${t.target} ${format(tile.targetMinutes)} · ${formatSignedDuration(tile.minutes - tile.targetMinutes, format)}`
            : undefined);
        return (
          <div
            key={tile.id}
            className="bg-card text-card-foreground border-border min-w-0 rounded-lg border px-4 py-3"
          >
            <dt className="text-small text-muted-foreground truncate">
              {tile.label}
            </dt>
            <dd className="mt-0.5 min-w-0">
              <TileValue tile={tile} format={format} t={t} />
            </dd>
            {context !== undefined && (
              <dd className="text-muted-foreground mt-0.5 truncate text-xs leading-4">
                {context}
              </dd>
            )}
          </div>
        );
      })}
    </dl>
  );
}

function TileValue({
  tile,
  format,
  t,
}: {
  tile: StatTile;
  format: FormatDuration;
  t: StatTilesStrings;
}) {
  if (tile.project) {
    return (
      <span
        className="text-title flex h-8.5 min-w-0 items-center gap-2"
        title={tile.project.name}
      >
        <ProjectDot color={tile.project.color} className="size-3" />
        <span className="truncate">{tile.project.name}</span>
      </span>
    );
  }
  const value =
    tile.minutes !== undefined ? format(tile.minutes) : (tile.value ?? null);
  const unit = tile.unit ?? (tile.minutes !== undefined ? t.hours : undefined);
  return (
    <span className="flex items-baseline gap-1 whitespace-nowrap">
      <span className="type-timer text-foreground leading-8.5 tracking-tight">
        {value ?? t.noValue}
      </span>
      {value !== null && unit && (
        <span className="text-body-strong text-muted-foreground">{unit}</span>
      )}
    </span>
  );
}
