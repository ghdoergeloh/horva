"use client";

import type { Key } from "react-aria-components";
import { useId } from "react";
import { ChevronRight, CloudUpload } from "lucide-react";
import {
  Disclosure,
  DisclosureGroup,
  DisclosurePanel,
  Button as RACButton,
} from "react-aria-components";

import { focusRing } from "@horva/ui";

import type { ProjectColor } from "./Chip";
import type { ChartKey } from "./ProjectDonut.data";
import type { FormatDuration } from "./TimerBar.format";
import { tv, twMerge } from "../lib/tw";
import { Button } from "./Button";
import { ProjectDot, projectColorValue } from "./Chip";
import { formatDuration } from "./TimerBar.format";

/** The texts of the ProjectBreakdown. German by default. */
export interface ProjectBreakdownStrings {
  title: string;
  transfer: string;
  empty: string;
  noTasks: string;
}

export const projectBreakdownStrings: ProjectBreakdownStrings = {
  title: "Details je Projekt",
  transfer: "An Moco übertragen",
  empty: "Keine Zeiten in diesem Zeitraum",
  noTasks: "Keine Aufgaben",
};

/** A project with its time and the time of its tasks. */
export interface BreakdownProject {
  id: ChartKey;
  name: string;
  color: ProjectColor | null;
  minutes: number;
  tasks: { id: ChartKey; name: string; minutes: number }[];
}

export interface ProjectBreakdownProps {
  /** Projects in the order to show, usually largest first. */
  projects: BreakdownProject[];
  defaultExpandedKeys?: Iterable<Key>;
  expandedKeys?: Iterable<Key>;
  onExpandedChange?: (keys: Set<Key>) => void;
  /** Shows the "An Moco übertragen" button in the head. */
  onTransfer?: () => void;
  isTransferPending?: boolean;
  /** @default 3 */
  headingLevel?: 2 | 3 | 4;
  strings?: Partial<ProjectBreakdownStrings>;
  formatDuration?: FormatDuration;
  className?: string;
}

const head = tv({
  extend: focusRing,
  base: "flex w-full cursor-default items-center gap-3 rounded-lg px-4 py-2.5 text-left hover:bg-accent hover:text-accent-foreground",
});

/**
 * Moves the focus between the row heads with the arrow keys, Home and End.
 */
function moveBetweenHeads(event: {
  key: string;
  target: EventTarget;
  preventDefault: () => void;
  continuePropagation?: () => void;
}) {
  const target = event.target as HTMLElement;
  const group = target.closest("[data-breakdown]");
  const heads = group
    ? [...group.querySelectorAll<HTMLElement>("[data-breakdown-head]")]
    : [];
  const index = heads.indexOf(target);
  const last = heads.length - 1;
  const next = {
    ArrowDown: Math.min(index + 1, last),
    ArrowUp: Math.max(index - 1, 0),
    Home: 0,
    End: last,
  }[event.key];
  if (index === -1 || next === undefined) {
    event.continuePropagation?.();
    return;
  }
  event.preventDefault();
  heads[next]?.focus();
}

/**
 * Details per project: rows that open to show the tasks with their time.
 * Each head is a button with `aria-expanded`; Enter and Space open it, the
 * arrow keys move between rows. The share bar is relative to the largest
 * project and is hidden below 448 px of width.
 */
export function ProjectBreakdown({
  projects,
  defaultExpandedKeys,
  expandedKeys,
  onExpandedChange,
  onTransfer,
  isTransferPending,
  headingLevel = 3,
  strings,
  formatDuration: format = formatDuration,
  className,
}: ProjectBreakdownProps) {
  const t = { ...projectBreakdownStrings, ...strings };
  const headingId = useId();
  const max = Math.max(0, ...projects.map((project) => project.minutes));
  const Heading = `h${String(headingLevel)}` as "h3";

  return (
    <section
      aria-labelledby={headingId}
      className={twMerge("@container", className)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Heading id={headingId} className="text-heading">
          {t.title}
        </Heading>
        {onTransfer && (
          <Button
            variant="secondary"
            size="sm"
            onPress={onTransfer}
            isPending={isTransferPending}
          >
            <CloudUpload aria-hidden />
            {t.transfer}
          </Button>
        )}
      </div>
      {projects.length === 0 ? (
        <p className="text-body text-foreground bg-card border-border rounded-lg border px-4 py-3">
          {t.empty}
        </p>
      ) : (
        <DisclosureGroup
          allowsMultipleExpanded
          data-breakdown
          defaultExpandedKeys={defaultExpandedKeys}
          expandedKeys={expandedKeys}
          onExpandedChange={onExpandedChange}
          className="flex flex-col gap-2"
        >
          {projects.map((project) => (
            <Disclosure
              key={String(project.id)}
              id={project.id}
              className="group bg-card text-card-foreground border-border rounded-lg border"
            >
              <RACButton
                slot="trigger"
                data-breakdown-head
                onKeyDown={moveBetweenHeads}
                className={(renderProps) => head(renderProps)}
              >
                <ChevronRight
                  aria-hidden
                  className="text-muted-foreground group-hover:text-accent-foreground size-4 shrink-0 group-data-expanded:rotate-90 motion-safe:transition-transform"
                />
                <ProjectDot color={project.color} className="size-3" />
                <span className="text-body flex-1 truncate font-semibold">
                  {project.name}
                </span>
                <span
                  aria-hidden
                  className="bg-muted h-1.5 w-40 shrink-0 overflow-hidden rounded-full @max-md:hidden"
                >
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${String(max > 0 ? (project.minutes / max) * 100 : 0)}%`,
                      background: projectColorValue(project.color),
                    }}
                  />
                </span>
                <span className="type-duration w-16 shrink-0 text-right">
                  {format(project.minutes)}
                </span>
              </RACButton>
              <DisclosurePanel>
                {project.tasks.length === 0 ? (
                  <p className="text-small text-muted-foreground border-border border-t px-4 py-2 pl-11">
                    {t.noTasks}
                  </p>
                ) : (
                  <ul className="border-border border-t py-1">
                    {project.tasks.map((task) => (
                      <li
                        key={String(task.id)}
                        className="text-small flex items-baseline justify-between gap-4 py-1.5 pr-4 pl-11"
                      >
                        <span className="min-w-0 [overflow-wrap:anywhere]">
                          {task.name}
                        </span>
                        <span className="type-duration-small shrink-0 text-right">
                          {format(task.minutes)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </DisclosurePanel>
            </Disclosure>
          ))}
        </DisclosureGroup>
      )}
    </section>
  );
}
