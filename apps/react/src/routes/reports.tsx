import type { CalendarDate } from "@internationalized/date";
import type { RangeValue } from "react-aria-components";
import { useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  getLocalTimeZone,
  startOfMonth,
  startOfWeek,
  startOfYear,
  today,
} from "@internationalized/date";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import type { DateRangePreset } from "@horva/ui/DateRangePicker";
import type { StatTile } from "@horva/ui/StatTiles";
import { Button } from "@horva/ui/Button";
import { DateRangePicker } from "@horva/ui/DateRangePicker";
import { HoursPerDay } from "@horva/ui/HoursPerDay";
import { Loader } from "@horva/ui/Logo";
import { ProjectBreakdown } from "@horva/ui/ProjectBreakdown";
import { formatPercent, ProjectDonut } from "@horva/ui/ProjectDonut";
import { Select, SelectItem } from "@horva/ui/Select";
import { StatTiles } from "@horva/ui/StatTiles";

import type { TimeFormat } from "#/contexts/SettingsContext.js";
import { MocoSyncModal } from "#/components/MocoSyncModal.js";
import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";
import { client } from "#/lib/orpc.js";
import {
  breakdownProjects,
  chartProjects,
  dayEntries,
  daysWithTime,
  donutProjects,
  shares,
  taskIdsWithLabel,
} from "#/lib/reportData.js";

/** The id of the "all labels" entry of the label filter. */
const ALL_LABELS = "all";

function calendarDateToDate(date: CalendarDate, endOfDay = false): Date {
  const d = date.toDate(getLocalTimeZone());
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

/**
 * The duration format of the user's setting for the report components.
 * They add the unit themselves, so the formatter leaves out the "h" of the
 * decimal formats; "1h 30m" keeps its own units.
 */
function durationFormat(timeFormat: TimeFormat) {
  return {
    format: (minutes: number) =>
      formatMinutesWithFormat(Math.round(minutes), timeFormat).replace(
        / h$/,
        "",
      ),
    unit: timeFormat === "hm" ? "" : "h",
  };
}

// Predefined ranges for the picker popover. Weeks start on Monday to match
// the timeline and the core period logic.
function buildPresets(
  t: (key: string) => string,
  locale: string,
): DateRangePreset[] {
  const now = today(getLocalTimeZone());
  const yesterday = now.subtract({ days: 1 });
  const lastWeek = now.subtract({ weeks: 1 });
  const lastMonth = now.subtract({ months: 1 });
  return [
    { id: "today", label: t("reports.today"), range: { start: now, end: now } },
    {
      id: "yesterday",
      label: t("reports.yesterday"),
      range: { start: yesterday, end: yesterday },
    },
    {
      id: "thisWeek",
      label: t("reports.thisWeek"),
      range: {
        start: startOfWeek(now, locale, "mon"),
        end: endOfWeek(now, locale, "mon"),
      },
    },
    {
      id: "lastWeek",
      label: t("reports.lastWeek"),
      range: {
        start: startOfWeek(lastWeek, locale, "mon"),
        end: endOfWeek(lastWeek, locale, "mon"),
      },
    },
    {
      id: "thisMonth",
      label: t("reports.thisMonth"),
      range: { start: startOfMonth(now), end: endOfMonth(now) },
    },
    {
      id: "lastMonth",
      label: t("reports.lastMonth"),
      range: { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) },
    },
    {
      id: "thisYear",
      label: t("reports.thisYear"),
      range: { start: startOfYear(now), end: endOfYear(now) },
    },
  ];
}

function Reports() {
  const { t, i18n } = useTranslation();
  const timeFormat = useTimeFormat();
  const timeZone = getLocalTimeZone();
  const [range, setRange] = useState<RangeValue<CalendarDate>>({
    start: today(timeZone),
    end: today(timeZone),
  });
  const [filterLabelId, setFilterLabelId] = useState<number | null>(null);
  const [showMocoSync, setShowMocoSync] = useState(false);

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const presets = buildPresets(t, locale);
  const { format, unit } = durationFormat(timeFormat);
  const withoutTask = t("reports.withoutTask");

  const syncRange = {
    from: calendarDateToDate(range.start),
    to: calendarDateToDate(range.end, true),
  };

  const { data: mocoStatus } = useQuery({
    queryKey: ["moco", "config"],
    queryFn: () => client.moco.config.get(),
  });

  const { data: allLabels = [] } = useQuery({
    queryKey: ["labels"],
    queryFn: async () => (await client.label.list()).labels,
  });

  const summaryQuery = useQuery({
    queryKey: ["log", "summary", range],
    queryFn: async () => (await client.log.summary(syncRange)).summary,
  });
  const slotsQuery = useQuery({
    queryKey: ["log", "raw", range],
    queryFn: async () => (await client.log.entries(syncRange)).slots,
  });
  const summary = summaryQuery.data ?? [];
  const logSlots = slotsQuery.data ?? [];
  const isLoading = summaryQuery.isPending || slotsQuery.isPending;
  const isError = summaryQuery.isError || slotsQuery.isError;
  const retry = () => {
    if (summaryQuery.isError) void summaryQuery.refetch();
    if (slotsQuery.isError) void slotsQuery.refetch();
  };

  const days = dayEntries(logSlots, range, timeZone, (date, dayCount) => {
    const day = date.toDate(timeZone);
    return {
      label: day.toLocaleDateString(
        locale,
        dayCount <= 7
          ? { weekday: "short" }
          : { day: "numeric", month: "numeric" },
      ),
      fullLabel: day.toLocaleDateString(locale, {
        weekday: "short",
        day: "numeric",
        month: "long",
      }),
    };
  });
  const isMultiDay = days.length > 1;

  const totalMinutes = summary.reduce((sum, e) => sum + e.totalMinutes, 0);
  const workDays = daysWithTime(days);
  const { largest, withoutTaskPercent } = shares(summary);
  const withoutTaskMinutes =
    summary.find((e) => e.projectId === null)?.totalMinutes ?? 0;

  const tiles: StatTile[] = [
    { id: "total", label: t("reports.total"), minutes: totalMinutes, unit },
    {
      id: "average",
      label: t("reports.averagePerDay"),
      minutes: workDays > 0 ? totalMinutes / workDays : undefined,
      unit,
      context: t("reports.daysLogged", { count: workDays }),
    },
    {
      id: "largest",
      label: t("reports.largestProject"),
      project: largest && {
        name: largest.entry.projectName,
        color: largest.entry.projectColor,
      },
      context:
        largest &&
        `${formatPercent(largest.percent)} · ${format(largest.entry.totalMinutes)}${unit && ` ${unit}`}`,
    },
    {
      id: "withoutTask",
      label: withoutTask,
      minutes: withoutTaskMinutes,
      unit,
      context: t("reports.shareOfTotal", {
        percent: formatPercent(withoutTaskPercent),
      }),
    },
  ];

  const filterLabel = allLabels.find((l) => l.id === filterLabelId);
  const labelledProjects = filterLabel
    ? breakdownProjects(
        summary,
        withoutTask,
        taskIdsWithLabel(logSlots, filterLabel.id),
      )
    : [];

  const breakdownStrings = {
    title: t("reports.detailsPerProject"),
    transfer: t("reports.transfer"),
    empty: t("reports.noData"),
    noTasks: t("reports.noTasks"),
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-display text-foreground">{t("reports.title")}</h1>
        <div className="flex max-w-full flex-wrap items-end gap-2">
          <DateRangePicker
            aria-label={t("reports.dateRange")}
            value={range}
            onChange={(next) => {
              if (next) setRange(next);
            }}
            presets={presets}
            isClearable={false}
            calendarLabel={t("reports.openCalendar")}
            previousRangeLabel={t("reports.previousRange")}
            nextRangeLabel={t("reports.nextRange")}
            formatDayCount={(count) => t("reports.dayCount", { count })}
          />
          {allLabels.length > 0 && (
            <Select
              aria-label={t("reports.filterLabel")}
              value={
                filterLabelId === null ? ALL_LABELS : String(filterLabelId)
              }
              onChange={(key) =>
                setFilterLabelId(
                  key === ALL_LABELS || key === null ? null : Number(key),
                )
              }
              className="w-48"
            >
              <SelectItem id={ALL_LABELS}>{t("reports.allLabels")}</SelectItem>
              {allLabels.map((l) => (
                <SelectItem key={l.id} id={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </Select>
          )}
        </div>
      </div>

      {isError ? (
        <div
          role="alert"
          className="bg-card text-card-foreground border-border flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3"
        >
          <p className="text-body">{t("reports.loadError")}</p>
          <Button variant="secondary" onPress={retry}>
            {t("error.retry")}
          </Button>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader
            size={64}
            label={t("loading")}
            className="animate-delayed-show opacity-0"
          />
        </div>
      ) : (
        <>
          <StatTiles
            tiles={tiles}
            formatDuration={format}
            strings={{ hours: unit, noValue: "–" }}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ProjectDonut
              projects={donutProjects(summary, withoutTask)}
              headingLevel={2}
              formatDuration={format}
              strings={{
                title: t("reports.projectShares"),
                hours: t("reports.hours"),
                hoursShort: unit,
                others: t("reports.others"),
                empty: t("reports.noData"),
              }}
              className={isMultiDay ? undefined : "xl:col-span-2"}
            />
            {isMultiDay && (
              <HoursPerDay
                projects={chartProjects(summary, withoutTask)}
                days={days}
                headingLevel={2}
                formatDuration={format}
                strings={{
                  title: t("reports.hoursPerDay"),
                  showTable: t("reports.showTable"),
                  hideTable: t("reports.hideTable"),
                  table: t("reports.hoursTable"),
                  day: t("reports.day"),
                  total: t("reports.sum"),
                  hoursShort: unit,
                  empty: t("reports.noData"),
                }}
                className="min-w-0"
              />
            )}
          </div>

          {filterLabel && (
            <ProjectBreakdown
              projects={labelledProjects}
              headingLevel={2}
              formatDuration={format}
              strings={{
                ...breakdownStrings,
                title: t("reports.tasksWithLabel", { name: filterLabel.name }),
              }}
              className="text-foreground"
            />
          )}

          <ProjectBreakdown
            projects={breakdownProjects(summary, withoutTask)}
            headingLevel={2}
            className="text-foreground"
            formatDuration={format}
            strings={breakdownStrings}
            onTransfer={
              mocoStatus?.configured ? () => setShowMocoSync(true) : undefined
            }
          />
        </>
      )}

      <MocoSyncModal
        isOpen={showMocoSync}
        onOpenChange={setShowMocoSync}
        from={syncRange.from}
        to={syncRange.to}
      />
    </div>
  );
}

export const Route = createFileRoute("/reports")({ component: Reports });
