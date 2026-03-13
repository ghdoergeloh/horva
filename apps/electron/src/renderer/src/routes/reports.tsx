import type { CalendarDate } from "@internationalized/date";
import type { RangeValue } from "react-aria-components";
import { useState } from "react";
import { getLocalTimeZone, today } from "@internationalized/date";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { Period } from "@repo/core";
import { DateRangePicker } from "@repo/ui/DateRangePicker";

import { LoadingSpinner } from "~/components/LoadingSpinner.js";
import { ProjectPie } from "~/components/ProjectPie.js";
import i18n from "~/i18n/index.js";
import { buildArcPath, lighten } from "~/lib/chartUtils.js";
import { formatMinutes } from "~/lib/timeFormatters.js";

interface SummaryEntry {
  projectId: number | null;
  projectName: string;
  projectColor: string;
  totalMinutes: number;
  tasks: { taskId: number; taskName: string; minutes: number }[];
}

interface RawSlot {
  startedAt: Date | string;
  endedAt: Date | string | null;
  task?: {
    id: number;
    name: string;
    project: { id: number; name: string; color: string };
    taskLabels?: { label: { id: number; name: string } }[];
  } | null;
}

interface LabelRow {
  id: number;
  name: string;
}

const PERIOD_VALUES: Period[] = ["today", "yesterday", "week", "month"];

function BarChart({ data }: { data: { label: string; minutes: number }[] }) {
  const max = Math.max(...data.map((d) => d.minutes), 1);
  return (
    <div className="space-y-2">
      {data.map((item, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-16 flex-shrink-0 text-right text-xs text-gray-500">
            {item.label}
          </span>
          <div className="h-5 flex-1 rounded bg-gray-100">
            <div
              className="h-full rounded bg-indigo-400"
              style={{ width: `${String((item.minutes / max) * 100)}%` }}
            />
          </div>
          <span className="w-12 flex-shrink-0 text-right text-xs text-gray-600">
            {formatMinutes(item.minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ProjectRow({ entry }: { entry: SummaryEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-100">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-gray-50"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400" />
        )}
        <div
          className="h-3 w-3 flex-shrink-0 rounded-sm"
          style={{ backgroundColor: entry.projectColor }}
        />
        <span className="flex-1 text-left text-sm font-medium text-gray-900">
          {entry.projectName}
        </span>
        <span className="text-sm font-semibold text-gray-900">
          {formatMinutes(entry.totalMinutes)}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="space-y-1.5">
            {entry.tasks.map((task) => (
              <div key={task.taskId} className="flex items-center gap-2 pl-7">
                <span className="flex-1 text-sm text-gray-700">
                  {task.taskName}
                </span>
                <span className="text-sm text-gray-500">
                  {formatMinutes(task.minutes)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Pie chart slices split by label (with/without)
interface SplitSlice {
  projectId: number | null;
  projectName: string;
  colorWith: string; // project color
  colorWithout: string; // lighter version
  minutesWith: number;
  minutesWithout: number;
}

function SplitProjectPie({
  slices,
  size = 200,
}: {
  slices: SplitSlice[];
  size?: number;
}) {
  const { t } = useTranslation();
  const total = slices.reduce(
    (s, p) => s + p.minutesWith + p.minutesWithout,
    0,
  );
  if (total === 0)
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        {t("reports.noDataShort")}
      </div>
    );

  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) * 0.85;
  let angle = -Math.PI / 2;

  const paths: {
    d: string;
    fill: string;
    key: string;
  }[] = [];

  for (const slice of slices) {
    for (const [minutes, fill] of [
      [slice.minutesWith, slice.colorWith],
      [slice.minutesWithout, lighten(slice.colorWith)],
    ] as [number, string][]) {
      if (minutes <= 0) continue;
      const sweep = (minutes / total) * 2 * Math.PI;
      const d = buildArcPath(cx, cy, r, angle, angle + sweep);
      paths.push({ d, fill, key: `${slice.projectId ?? "x"}-${fill}` });
      angle += sweep;
    }
  }

  const isSinglePath = paths.length === 1;

  return (
    <div className="flex items-start gap-6">
      <svg width={size} height={size} className="flex-shrink-0">
        {isSinglePath ? (
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill={paths[0]!.fill}
            stroke="white"
            strokeWidth={2}
          />
        ) : (
          paths.map((p) => (
            <path
              key={p.key}
              d={p.d}
              fill={p.fill}
              stroke="white"
              strokeWidth={2}
            />
          ))
        )}
      </svg>
      <div className="flex-1 space-y-2 pt-2">
        {slices.map((slice) => (
          <div key={slice.projectId ?? "no_task"} className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 flex-shrink-0 rounded-sm"
                style={{ backgroundColor: slice.colorWith }}
              />
              <span className="flex-1 text-sm font-medium text-gray-700">
                {slice.projectName}
              </span>
              <span className="text-sm text-gray-900">
                {formatMinutes(slice.minutesWith + slice.minutesWithout)}
              </span>
            </div>
            {slice.minutesWith > 0 && (
              <div className="flex items-center gap-2 pl-5">
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: slice.colorWith }}
                />
                <span className="flex-1 text-xs text-gray-500">
                  {t("reports.withLabel")}
                </span>
                <span className="text-xs text-gray-700">
                  {formatMinutes(slice.minutesWith)}
                </span>
              </div>
            )}
            {slice.minutesWithout > 0 && (
              <div className="flex items-center gap-2 pl-5">
                <div
                  className="h-2 w-2 flex-shrink-0 rounded-sm"
                  style={{ backgroundColor: lighten(slice.colorWith) }}
                />
                <span className="flex-1 text-xs text-gray-400">
                  {t("reports.withoutLabel")}
                </span>
                <span className="text-xs text-gray-400">
                  {formatMinutes(slice.minutesWithout)}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function calendarDateToDate(date: CalendarDate, endOfDay = false): Date {
  const d = date.toDate(getLocalTimeZone());
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function Reports() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period | "custom">("today");
  const [customRange, setCustomRange] = useState<RangeValue<CalendarDate>>({
    start: today(getLocalTimeZone()),
    end: today(getLocalTimeZone()),
  });
  const [filterLabelId, setFilterLabelId] = useState<number | null>(null);

  const isCustom = period === "custom";

  const periodLabels: Partial<Record<Period, string>> = {
    today: t("reports.today"),
    yesterday: t("reports.yesterday"),
    week: t("reports.thisWeek"),
    month: t("reports.thisMonth"),
  };

  const { data: allLabels = [] } = useQuery({
    queryKey: ["labels"],
    queryFn: () => window.api.labels.list() as Promise<LabelRow[]>,
  });

  const { data: summary = [], isLoading } = useQuery({
    queryKey: ["log", "summary", period, isCustom ? customRange : null],
    queryFn: () => {
      if (isCustom) {
        const from = calendarDateToDate(customRange.start).toISOString();
        const to = calendarDateToDate(customRange.end, true).toISOString();
        return window.api.log.getSummaryRange(from, to) as Promise<
          SummaryEntry[]
        >;
      }
      return window.api.log.getSummary(period) as Promise<SummaryEntry[]>;
    },
  });

  const { data: logSlots = [] } = useQuery({
    queryKey: ["log", "raw", period, isCustom ? customRange : null],
    queryFn: () => {
      if (isCustom) {
        const from = calendarDateToDate(customRange.start).toISOString();
        const to = calendarDateToDate(customRange.end, true).toISOString();
        return window.api.log.getRange(from, to) as Promise<RawSlot[]>;
      }
      return window.api.log.get(period) as Promise<RawSlot[]>;
    },
  });

  const totalMinutes = summary.reduce((s, e) => s + e.totalMinutes, 0);

  // Per-day totals for bar chart
  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const dayMap = new Map<string, number>();
  for (const s of logSlots) {
    if (!s.endedAt) continue;
    const dayKey = new Date(s.startedAt).toISOString().slice(0, 10);
    const mins = Math.round(
      (new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()) / 60000,
    );
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + mins);
  }
  const dayData = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, minutes]) => ({
      label: new Date(key).toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
      }),
      minutes,
    }));

  const isMultiDay = dayMap.size > 1;
  const avgDailyMinutes = isMultiDay
    ? Math.round(totalMinutes / dayMap.size)
    : 0;

  // Build split pie data for label filter
  const splitSlices: SplitSlice[] = filterLabelId
    ? summary.map((entry) => {
        // Tasks with the label
        const withLabelTaskIds = new Set(
          logSlots
            .filter(
              (s) =>
                s.task?.project.id === entry.projectId &&
                s.task.taskLabels?.some((tl) => tl.label.id === filterLabelId),
            )
            .map((s) => s.task?.id),
        );
        const minutesWith = entry.tasks
          .filter((t) => withLabelTaskIds.has(t.taskId))
          .reduce((s, t) => s + t.minutes, 0);
        return {
          projectId: entry.projectId,
          projectName: entry.projectName,
          colorWith: entry.projectColor,
          colorWithout: entry.projectColor,
          minutesWith,
          minutesWithout: entry.totalMinutes - minutesWith,
        };
      })
    : [];

  // Tasks with selected label (cross-project)
  const tasksWithLabel: {
    taskId: number;
    taskName: string;
    projectName: string;
    projectColor: string;
    minutes: number;
  }[] = filterLabelId
    ? summary.flatMap((entry) => {
        const labelTaskIds = new Set(
          logSlots
            .filter(
              (s) =>
                s.task?.project.id === entry.projectId &&
                s.task.taskLabels?.some((tl) => tl.label.id === filterLabelId),
            )
            .map((s) => s.task?.id),
        );
        return entry.tasks
          .filter((t) => labelTaskIds.has(t.taskId))
          .map((t) => ({
            taskId: t.taskId,
            taskName: t.taskName,
            projectName: entry.projectName,
            projectColor: entry.projectColor,
            minutes: t.minutes,
          }));
      })
    : [];

  const labelTotalMinutes = tasksWithLabel.reduce((s, t) => s + t.minutes, 0);

  const filterLabel = allLabels.find((l) => l.id === filterLabelId);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header + period + label picker */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("reports.title")}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg border border-gray-200 bg-white p-1">
            {PERIOD_VALUES.map((value) => (
              <button
                key={value}
                onClick={() => setPeriod(value)}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  period === value
                    ? "bg-indigo-600 font-medium text-white"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                {periodLabels[value] ?? value}
              </button>
            ))}
            <button
              onClick={() => setPeriod("custom")}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                period === "custom"
                  ? "bg-indigo-600 font-medium text-white"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t("reports.custom")}
            </button>
          </div>
          {isCustom && (
            <DateRangePicker
              aria-label={t("reports.dateRange")}
              value={customRange}
              onChange={(range) => {
                if (range) setCustomRange(range);
              }}
            />
          )}

          {/* Label filter */}
          {allLabels.length > 0 && (
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1">
              {filterLabel ? (
                <>
                  <span className="text-sm text-gray-700">
                    {filterLabel.name}
                  </span>
                  <button
                    onClick={() => setFilterLabelId(null)}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <select
                  value=""
                  onChange={(e) =>
                    setFilterLabelId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="bg-transparent text-sm text-gray-500 outline-none"
                >
                  <option value="">{t("reports.filterLabel")}</option>
                  {allLabels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner size={64} label={t("loading")} />
        </div>
      ) : (
        <>
          {/* Total */}
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm text-gray-500">
              {t("reports.totalWorktime")}
            </p>
            <p className="mt-1 text-4xl font-bold text-gray-900">
              {formatMinutes(totalMinutes)}
            </p>
            {avgDailyMinutes > 0 && (
              <p className="mt-1 text-sm text-gray-400">
                {t("reports.avgPerDay", {
                  time: formatMinutes(avgDailyMinutes),
                })}
              </p>
            )}
          </div>

          {/* Pie chart — split if label filter active */}
          {summary.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">
                {t("reports.projectShares")}
                {filterLabel && (
                  <span className="ml-2 font-normal text-gray-400">
                    {t("reports.labelFilter", { name: filterLabel.name })}
                  </span>
                )}
              </h2>
              {filterLabelId ? (
                <SplitProjectPie slices={splitSlices} />
              ) : (
                <ProjectPie data={summary} />
              )}
            </div>
          )}

          {/* Bar chart */}
          {isMultiDay && (
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">
                {t("reports.hoursPerDay")}
              </h2>
              <BarChart data={dayData} />
            </div>
          )}

          {/* Tasks with selected label */}
          {filterLabel && tasksWithLabel.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">
                {t("reports.tasksWithLabel", { name: filterLabel.name })}
                <span className="ml-2 font-normal text-gray-400">
                  {formatMinutes(labelTotalMinutes)}
                </span>
              </h2>
              <div className="divide-y divide-gray-50 overflow-hidden rounded-xl border border-gray-200 bg-white">
                {tasksWithLabel
                  .sort((a, b) => b.minutes - a.minutes)
                  .map((task) => (
                    <div
                      key={task.taskId}
                      className="flex items-center gap-3 px-4 py-2.5"
                    >
                      <div
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-sm"
                        style={{ backgroundColor: task.projectColor }}
                      />
                      <span className="flex-1 text-sm text-gray-800">
                        {task.taskName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {task.projectName}
                      </span>
                      <span className="w-16 text-right text-sm font-medium text-gray-700">
                        {formatMinutes(task.minutes)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Per-project breakdown */}
          {summary.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">
                {t("reports.detailsPerProject")}
              </h2>
              {summary
                .sort((a, b) => b.totalMinutes - a.totalMinutes)
                .map((entry) => (
                  <ProjectRow
                    key={entry.projectId ?? "no_task"}
                    entry={entry}
                  />
                ))}
            </div>
          )}

          {summary.length === 0 && (
            <div className="flex items-center justify-center py-20 text-gray-400">
              {t("reports.noData")}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export const Route = createFileRoute("/reports")({ component: Reports });
