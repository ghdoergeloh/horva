import type { TFunction } from "i18next";

import type { DayBarsLabels } from "@horva/ui/DayBars";
import type { ProjectBreakdownStrings } from "@horva/ui/ProjectBreakdown";
import type { SlotTableLabels } from "@horva/ui/SlotTable";
import type { WeekHeaderLabels } from "@horva/ui/WeekHeader";
import type { WorkPeriodListLabels } from "@horva/ui/WorkPeriodList";

import type { SlotTexts } from "#/lib/timeline.js";

/** The locale for dates of the current language. */
export function dateLocale(language: string): string {
  return language.startsWith("en") ? "en-US" : "de-DE";
}

/** The texts of the week header in the current language. */
export function weekHeaderLabels(t: TFunction): WeekHeaderLabels {
  return {
    previousWeek: t("timeline.previousWeek"),
    nextWeek: t("timeline.nextWeek"),
    thisWeek: t("timeline.thisWeek"),
    view: t("timeline.view"),
    slots: t("timeline.slots"),
    tasks: t("timeline.tasks"),
    periods: t("timeline.periods"),
  };
}

/** The texts of the day bars in the current language. */
export function dayBarsLabels(t: TFunction, locale: string): DayBarsLabels {
  const dayName = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
  });
  return {
    now: t("timeline.now"),
    to: t("timeline.to"),
    hours: t("timeline.hours"),
    dayName: (date) => dayName.format(date),
    total: (duration) => t("timeline.dayTotal", { duration }),
  };
}

/** Texts for slots without a task or project. */
export function slotTexts(t: TFunction): SlotTexts {
  return {
    noTask: t("timeline.noTask"),
    deletedTask: t("timeline.deletedTask"),
    noProject: t("timeline.noProject"),
  };
}

/** The texts of the slot table in the current language. */
export function slotTableLabels(t: TFunction): SlotTableLabels {
  const k = "timeline.slotTable";
  return {
    from: t(`${k}.from`),
    to: t(`${k}.to`),
    duration: t(`${k}.duration`),
    task: t(`${k}.task`),
    project: t(`${k}.project`),
    actions: t(`${k}.actions`),
    now: t("timeline.now"),
    noTask: t("timeline.noTask"),
    gap: t(`${k}.gap`),
    addSlot: t(`${k}.addSlot`),
    addSlotIn: (from, to) => t(`${k}.addSlotIn`, { from, to }),
    edit: (from, to) => t(`${k}.edit`, { from, to }),
    empty: t(`${k}.empty`),
    start: t(`${k}.start`),
    end: t(`${k}.end`),
    save: t(`${k}.save`),
    cancel: t(`${k}.cancel`),
    missingTime: t(`${k}.missingTime`),
    endNotAfterStart: t(`${k}.endNotAfterStart`),
    startAfterNow: t(`${k}.startAfterNow`),
    saveFailed: t(`${k}.saveFailed`),
    nextDay: t(`${k}.nextDay`),
  };
}

/** The texts of the work period list in the current language. */
export function workPeriodLabels(t: TFunction): WorkPeriodListLabels {
  const k = "timeline.periodList";
  return {
    from: t(`${k}.from`),
    to: t(`${k}.to`),
    duration: t(`${k}.duration`),
    content: t(`${k}.content`),
    actions: t(`${k}.actions`),
    now: t("timeline.now"),
    slots: (count) => t(`${k}.slots`, { count }),
    break: t(`${k}.break`),
    copyPeriod: (text) => t(`${k}.copyPeriod`, { text }),
    copyDay: t(`${k}.copyDay`),
    copied: t(`${k}.copied`),
    copyFailed: t(`${k}.copyFailed`),
    workTime: t(`${k}.workTime`),
    breakTotal: (duration) => t(`${k}.breakTotal`, { duration }),
    empty: t(`${k}.empty`),
  };
}

/** The texts of the task summary of a day in the current language. */
export function taskSummaryStrings(
  t: TFunction,
  day: string,
): Partial<ProjectBreakdownStrings> {
  return {
    title: t("timeline.taskSummary.title", { day }),
    empty: t("timeline.taskSummary.empty"),
    noTasks: t("timeline.taskSummary.noTasks"),
  };
}
