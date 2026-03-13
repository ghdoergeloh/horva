import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { DayRow } from "~/components/DayRow.js";
import i18n from "~/i18n/index.js";
import { endOfDay, localDateStr, startOfDay } from "~/lib/dateUtils.js";

interface SlotRow {
  id: number;
  startedAt: Date | string;
  endedAt: Date | string | null;
  taskId: number | null;
  state: string;
  task?: {
    id: number;
    name: string;
    project: { name: string; color: string };
  } | null;
}

interface TaskOption {
  id: number;
  name: string;
  project: { name: string; color: string };
}

function getWeekDays(weekOffset = 0): Date[] {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + weekOffset * 7);
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function formatWeekLabel(days: Date[]): string {
  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const first = days[0];
  const last = days[6];
  if (!first || !last) return "";
  const sameMonth = first.getMonth() === last.getMonth();
  const sameYear = first.getFullYear() === last.getFullYear();
  if (sameMonth) {
    return `${String(first.getDate())}. – ${last.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" })}`;
  }
  if (sameYear) {
    return `${first.toLocaleDateString(locale, { day: "numeric", month: "short" })} – ${last.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
  }
  return `${first.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })} – ${last.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" })}`;
}

function getTimeRange(slots: SlotRow[]): { minH: number; maxH: number } {
  if (slots.length === 0) return { minH: 8, maxH: 18 };
  let minH = 23;
  let maxH = 0;
  for (const s of slots) {
    const start = new Date(s.startedAt);
    const h = start.getHours() + start.getMinutes() / 60;
    if (h < minH) minH = h;
    if (s.endedAt) {
      const end = new Date(s.endedAt);
      const eh = end.getHours() + end.getMinutes() / 60;
      if (eh > maxH) maxH = eh;
    }
  }
  return { minH: Math.floor(minH), maxH: Math.ceil(maxH) };
}

function Timeline() {
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);
  const [viewMode, setViewMode] = useState<"slots" | "tasks">("slots");
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const weekDays = getWeekDays(weekOffset);
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];
  if (!firstDay || !lastDay) throw new Error("Week days not calculated");

  const from = startOfDay(firstDay).toISOString();
  const to = endOfDay(lastDay).toISOString();
  const isCurrentWeek = weekOffset === 0;

  const todayStr = localDateStr(new Date());

  const [expandedDays, setExpandedDays] = useState<Set<string>>(
    () => new Set([todayStr]),
  );

  function toggleDay(dayStr: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayStr)) {
        next.delete(dayStr);
      } else {
        next.add(dayStr);
      }
      return next;
    });
  }

  const { data: allSlots = [] } = useQuery({
    queryKey: ["slots", from, to],
    queryFn: () => window.api.slots.list(from, to) as Promise<SlotRow[]>,
    refetchInterval: 15000,
  });

  const { data: allTasks = [] } = useQuery({
    queryKey: ["tasks", "open"],
    queryFn: () =>
      window.api.tasks.list({ status: "open" }) as Promise<TaskOption[]>,
  });

  const projectOptions = Array.from(
    new Map(
      allSlots.flatMap((s) =>
        s.task?.project
          ? [
              [
                s.task.project.name,
                { name: s.task.project.name, color: s.task.project.color },
              ] as const,
            ]
          : [],
      ),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  const visibleSlots =
    filterProject === null
      ? allSlots
      : allSlots.filter((s) => s.task?.project.name === filterProject);

  const slotsByDay = weekDays.map((day) => {
    const dayStr = localDateStr(day);
    return visibleSlots.filter(
      (s) => localDateStr(new Date(s.startedAt)) === dayStr,
    );
  });

  const { minH, maxH } = getTimeRange(visibleSlots);
  const hourTicks = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i);

  return (
    <div className="mx-auto flex h-full w-full max-w-5xl flex-col">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="rounded p-1 hover:bg-gray-100"
          aria-label={t("timeline.previousWeek")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="w-64 text-center text-lg font-semibold text-gray-900">
          {formatWeekLabel(weekDays)}
        </h1>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          disabled={isCurrentWeek}
          className="rounded p-1 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={t("timeline.nextWeek")}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        {!isCurrentWeek && (
          <button
            onClick={() => setWeekOffset(0)}
            className="ml-2 rounded-md border border-gray-200 px-3 py-1 text-sm hover:bg-gray-50"
          >
            {t("timeline.today")}
          </button>
        )}
        {/* Project filter */}
        {projectOptions.length > 0 && (
          <div className="ml-auto flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1">
            {filterProject !== null ? (
              <>
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{
                    backgroundColor:
                      projectOptions.find((p) => p.name === filterProject)
                        ?.color ?? "#9ca3af",
                  }}
                />
                <span className="text-sm text-gray-700">{filterProject}</span>
                <button
                  onClick={() => setFilterProject(null)}
                  className="ml-1 text-gray-400 hover:text-gray-600"
                  aria-label={t("timeline.removeFilter")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <select
                value=""
                onChange={(e) => setFilterProject(e.target.value || null)}
                className="bg-transparent text-sm text-gray-500 outline-none"
              >
                <option value="">{t("timeline.filterProject")}</option>
                {projectOptions.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
        <div
          className={`flex gap-1 rounded-lg border border-gray-200 bg-white p-1 ${projectOptions.length > 0 ? "" : "ml-auto"}`}
        >
          <button
            onClick={() => setViewMode("slots")}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              viewMode === "slots"
                ? "bg-indigo-600 font-medium text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t("timeline.slots")}
          </button>
          <button
            onClick={() => setViewMode("tasks")}
            className={`rounded-md px-3 py-1 text-sm transition-colors ${
              viewMode === "tasks"
                ? "bg-indigo-600 font-medium text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {t("timeline.tasks")}
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white p-4">
        {/* Hour scale */}
        <div className="mb-2 flex items-center gap-4">
          <div className="w-16 shrink-0" />
          <div className="relative h-5 flex-1">
            {hourTicks.map((h) => {
              const left = ((h - minH) / (maxH - minH || 1)) * 100;
              return (
                <span
                  key={h}
                  style={{ position: "absolute", left: `${String(left)}%` }}
                  className="-translate-x-1/2 text-xs text-gray-400"
                >
                  {String(h).padStart(2, "0")}:00
                </span>
              );
            })}
          </div>
          <div className="w-16 shrink-0" />
        </div>

        {/* Day rows */}
        <div className="space-y-1">
          {weekDays.map((day, i) => {
            const dayStr = localDateStr(day);
            return (
              <DayRow
                key={day.toISOString()}
                date={day}
                slots={slotsByDay[i] ?? []}
                allTasks={allTasks}
                minH={minH}
                maxH={maxH}
                expanded={expandedDays.has(dayStr) || dayStr === todayStr}
                onToggle={() => toggleDay(dayStr)}
                viewMode={viewMode}
                hideGaps={filterProject !== null}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/timeline")({ component: Timeline });
