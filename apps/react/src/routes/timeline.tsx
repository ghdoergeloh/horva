import type { Key } from "react-aria-components";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { DayBarsDay } from "@horva/ui/DayBars";
import type { SlotTableEditing } from "@horva/ui/SlotTable";
import type { TaskPickerTask } from "@horva/ui/TaskPicker";
import type { TimelineView } from "@horva/ui/WeekHeader";
import { ProjectDot } from "@horva/ui/Chip";
import { DayBars } from "@horva/ui/DayBars";
import { Loader } from "@horva/ui/Logo";
import { Select, SelectItem } from "@horva/ui/Select";
import { WeekHeader } from "@horva/ui/WeekHeader";

import type { TimelineProject } from "#/lib/timeline.js";
import { TimelineDay } from "#/components/TimelineDay.js";
import { client } from "#/lib/orpc.js";
import {
  addDays,
  dayKey,
  periodsOverlapping,
  projectsOfSlots,
  slotColor,
  slotsOverlapping,
  slotsStartingOn,
  slotTitle,
  startOfWeek,
  weekDays,
  weekQueryRange,
} from "#/lib/timeline.js";
import {
  dateLocale,
  dayBarsLabels,
  slotTexts,
  weekHeaderLabels,
} from "#/lib/timelineLabels.js";

const ALL_PROJECTS = "all";

/** The current time, updated every 30 seconds for running slots. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * The timeline: the week as day bars, with the slots, the time per task or
 * the work periods of an opened day.
 */
function Timeline() {
  const { t, i18n } = useTranslation();
  const locale = dateLocale(i18n.language);
  const now = useNow();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [view, setView] = useState<TimelineView>("slots");
  const [projectFilter, setProjectFilter] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<Set<Key>>(
    () => new Set([dayKey(new Date())]),
  );
  const [editing, setEditing] = useState<{
    day: string;
    editing: SlotTableEditing;
  } | null>(null);

  const days = weekDays(weekStart);
  const { from, to } = weekQueryRange(weekStart);

  const slotsQuery = useQuery({
    queryKey: ["slots", "week", from.toISOString()],
    queryFn: async () => (await client.slot.list({ from, to })).slots,
    refetchInterval: 15_000,
  });
  const periodsQuery = useQuery({
    queryKey: ["slots", "periods", from.toISOString()],
    queryFn: async () => (await client.log.workPeriods({ from, to })).periods,
    enabled: view === "periods",
    refetchInterval: 15_000,
  });
  const { data: openTasks = [] } = useQuery({
    queryKey: ["tasks", "open"],
    queryFn: async () => (await client.task.list({ status: "open" })).tasks,
  });
  const { data: projectList = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => (await client.project.list({})).projects,
  });

  // The query starts a day early; keep what reaches into this week.
  const allSlots = (slotsQuery.data ?? []).filter(
    (s) => (s.endedAt ?? now) > weekStart,
  );
  const periods = (periodsQuery.data ?? []).filter(
    (p) => (p.endedAt ?? now) > weekStart,
  );
  const texts = slotTexts(t);
  const weekProjects = projectsOfSlots(allSlots);
  const filter =
    projectFilter !== null && weekProjects.some((p) => p.id === projectFilter)
      ? projectFilter
      : null;
  const visibleSlots =
    filter === null
      ? allSlots
      : allSlots.filter((s) => s.task?.projectId === filter);

  const projectsById = new Map<number, TimelineProject>(
    projectList.map((p) => [p.id, { id: p.id, name: p.name, color: p.color }]),
  );
  const pickerProjects = projectList.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
  }));
  // Slots can point to tasks that are done; the picker still names them.
  const pickerTasks = new Map<number, TaskPickerTask>();
  for (const task of openTasks)
    pickerTasks.set(task.id, {
      id: task.id,
      name: task.name,
      projectId: task.projectId,
    });
  for (const slot of allSlots)
    if (slot.task && !pickerTasks.has(slot.task.id))
      pickerTasks.set(slot.task.id, {
        id: slot.task.id,
        name: slot.task.name,
        projectId: slot.task.projectId,
      });
  const lastProjectId =
    [...allSlots]
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime())
      .find((s) => s.task)?.task?.projectId ?? null;

  const barDays: DayBarsDay[] = days.map((date) => ({
    id: dayKey(date),
    date,
    blocks:
      view === "periods"
        ? periodsOverlapping(periods, date, now).map((p) => ({
            id: p.startedAt.toISOString(),
            start: p.startedAt,
            end: p.endedAt,
            title: t("timeline.workTime"),
          }))
        : slotsOverlapping(visibleSlots, date, now).map((s) => ({
            id: s.id,
            start: s.startedAt,
            end: s.endedAt,
            title: slotTitle(s, texts),
            subtitle: s.task?.project.name,
            color: slotColor(s),
          })),
  }));

  const barLabels = dayBarsLabels(t, locale);
  const isLoading =
    slotsQuery.isPending || (view === "periods" && periodsQuery.isPending);
  const failed = slotsQuery.isError || periodsQuery.isError;

  return (
    // `relative` keeps the screen reader texts of the tables inside the page.
    <div className="relative mx-auto flex w-full max-w-5xl flex-col gap-4">
      <h1 className="sr-only">{t("timeline.title")}</h1>
      <WeekHeader
        weekStart={weekStart}
        now={now}
        onPreviousWeek={() => setWeekStart((w) => addDays(w, -7))}
        onNextWeek={() => setWeekStart((w) => addDays(w, 7))}
        onThisWeek={() => setWeekStart(startOfWeek(new Date()))}
        view={view}
        onViewChange={(next) => {
          setEditing(null);
          setView(next);
        }}
        locale={locale}
        labels={weekHeaderLabels(t)}
        filter={
          weekProjects.length > 0 && (
            <Select
              aria-label={t("timeline.filterProject")}
              // Work periods are about working time, whatever the project.
              isDisabled={view === "periods"}
              value={filter === null ? ALL_PROJECTS : String(filter)}
              onChange={(key) => {
                setEditing(null);
                setProjectFilter(
                  key === ALL_PROJECTS || key === null ? null : Number(key),
                );
              }}
              className="w-45 @max-lg:w-full @max-lg:min-w-0"
            >
              <SelectItem id={ALL_PROJECTS}>
                {t("timeline.allProjects")}
              </SelectItem>
              {weekProjects.map((p) => (
                <SelectItem key={p.id} id={String(p.id)} textValue={p.name}>
                  <span className="flex min-w-0 items-center gap-2">
                    <ProjectDot color={p.color} />
                    <span className="truncate">{p.name}</span>
                  </span>
                </SelectItem>
              ))}
            </Select>
          )
        }
      />
      <div className="bg-card border-border @container rounded-lg border p-4">
        {failed ? (
          <p role="alert" className="text-body text-foreground">
            {t("timeline.loadFailed")}
          </p>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader
              size={48}
              label={t("loading")}
              className="animate-delayed-show opacity-0"
            />
          </div>
        ) : (
          <DayBars
            days={barDays}
            now={now}
            variant={view === "periods" ? "periods" : "slots"}
            expandedDays={expanded}
            onExpandedChange={setExpanded}
            labels={barLabels}
            onSlotPress={(block, day) => {
              if (view === "periods") return;
              // A slot across midnight belongs to the day it starts on.
              const slot = allSlots.find((s) => s.id === block.id);
              const key = slot ? dayKey(slot.startedAt) : String(day.id);
              setView("slots");
              setExpanded((keys) => new Set(keys).add(key));
              setEditing({ day: key, editing: { kind: "slot", id: block.id } });
            }}
            renderDay={(day) => {
              const key = String(day.id);
              return (
                <TimelineDay
                  date={day.date}
                  dayName={barLabels.dayName(day.date)}
                  view={view}
                  slots={slotsStartingOn(visibleSlots, day.date)}
                  allSlots={slotsStartingOn(allSlots, day.date)}
                  overlappingSlots={slotsOverlapping(allSlots, day.date, now)}
                  periods={periodsOverlapping(periods, day.date, now)}
                  isFiltered={filter !== null}
                  now={now}
                  editing={editing?.day === key ? editing.editing : null}
                  onEditingChange={(next) =>
                    setEditing(next && { day: key, editing: next })
                  }
                  projects={pickerProjects}
                  tasks={[...pickerTasks.values()]}
                  projectsById={projectsById}
                  lastProjectId={lastProjectId}
                />
              );
            }}
          />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/timeline")({ component: Timeline });
