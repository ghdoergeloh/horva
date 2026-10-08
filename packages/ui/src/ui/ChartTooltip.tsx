import { twMerge } from "../lib/tw";

export interface ChartTooltipProps {
  /** Point the tooltip points at, in px from the top left of the parent. */
  x: number;
  y: number;
  title: string;
  lines: string[];
  className?: string;
}

/**
 * The small dark box over a chart segment. Only for the eye: the focused
 * segment carries the same text as its accessible name. The parent needs
 * `position: relative`.
 */
export function ChartTooltip({
  x,
  y,
  title,
  lines,
  className,
}: ChartTooltipProps) {
  return (
    <div
      aria-hidden
      className={twMerge(
        "bg-foreground text-background pointer-events-none absolute z-(--z-popover) -translate-x-1/2 -translate-y-full rounded-md px-2.5 py-1.5 text-xs leading-4 whitespace-nowrap shadow-md",
        className,
      )}
      style={{ left: x, top: y - 8 }}
    >
      <div className="font-semibold">{title}</div>
      {lines.map((line) => (
        <div key={line} className="font-mono tabular-nums">
          {line}
        </div>
      ))}
    </div>
  );
}
