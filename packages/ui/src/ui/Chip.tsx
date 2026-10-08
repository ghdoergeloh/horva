import type React from "react";

import { twMerge } from "../lib/tw";

/**
 * A project color as stored: a token name (`project-3`, `project-none`,
 * `project-deleted`) or a hex value the user picked. Token names follow the
 * theme, so dark mode gets its own shade.
 */
export type ProjectColor = string;

const tokenName = /^project-(?:[1-9]|1[0-8]|none|deleted)$/;

/** The CSS value for a stored project color. */
export function projectColorValue(color: ProjectColor | null | undefined) {
  if (!color) return "var(--project-none)";
  return tokenName.test(color) ? `var(--${color})` : color;
}

export interface ProjectDotProps {
  color: ProjectColor | null | undefined;
  /** @default 'md' (10 px); `sm` is 8 px for chips. */
  size?: "sm" | "md";
  className?: string;
}

/** The round project mark. Decorative: the project name stands next to it. */
export function ProjectDot({ color, size = "md", className }: ProjectDotProps) {
  return (
    <span
      aria-hidden
      className={twMerge(
        "inline-block shrink-0 rounded-full",
        size === "sm" ? "size-2" : "size-2.5",
        className,
      )}
      style={{ backgroundColor: projectColorValue(color) }}
    />
  );
}

export interface ChipProps {
  children: React.ReactNode;
  /** With a project color the chip shows the project dot before the text. */
  color?: ProjectColor | null;
  className?: string;
  /** Full text for the tooltip when the label is cut off. */
  title?: string;
}

/** A small neutral label, for a project (with dot) or a label. */
export function Chip({ children, color, className, title }: ChipProps) {
  return (
    <span
      title={title}
      className={twMerge(
        "bg-secondary text-secondary-foreground text-caption inline-flex h-5.5 max-w-45 min-w-0 items-center gap-1 rounded-sm px-2",
        className,
      )}
    >
      {color !== undefined && <ProjectDot color={color} size="sm" />}
      <span className="truncate">{children}</span>
    </span>
  );
}

/** A keyboard shortcut, such as `⌘ Enter`, next to a label. */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={twMerge(
        "inline-flex h-4 items-center rounded-[4px] border border-current px-1 font-mono text-[11px] leading-4 font-medium",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** The "running" marker: a calm pulsing orange dot and a short word. */
export function LiveBadge({
  children = "läuft",
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={twMerge(
        "text-running-text text-caption inline-flex items-center gap-1.5 font-semibold",
        className,
      )}
    >
      <span
        aria-hidden
        className="bg-running motion-safe:animate-running-pulse size-2 rounded-full"
      />
      {children}
    </span>
  );
}
