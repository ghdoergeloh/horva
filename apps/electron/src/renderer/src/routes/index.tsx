import { useState } from "react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@timetracker/ui/Button";

import type { LabelRow } from "~/components/TaskEditControls.js";
import { LoadingSpinner } from "~/components/LoadingSpinner.js";
import { TaskCard } from "~/components/TaskCard.js";
import i18n from "~/i18n/index.js";

interface TaskRow {
  id: number;
  name: string;
  status: string;
  taskType: string;
  scheduledAt: Date | null;
  recurrenceRule: string | null;
  project: { name: string; color: string };
  taskLabels: { label: { id: number; name: string } }[];
  slots: { startedAt: Date; endedAt: Date | null }[];
}

function calcTotalMinutes(slots: TaskRow["slots"]): number {
  return slots.reduce((sum, s) => {
    if (!s.endedAt) return sum;
    return (
      sum + Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 60000)
    );
  }, 0);
}

interface CollapsibleSectionProps {
  title: string;
  count: number;
  titleClassName?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function CollapsibleSection({
  title,
  count,
  titleClassName = "text-gray-500",
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section>
      <Button
        variant="quiet"
        onPress={() => setOpen((v) => !v)}
        className="mb-3 flex items-center gap-1.5 text-left"
        aria-label={title}
      >
        {open ? (
          <ChevronDown className={`h-3.5 w-3.5 ${titleClassName}`} />
        ) : (
          <ChevronRight className={`h-3.5 w-3.5 ${titleClassName}`} />
        )}
        <h2
          className={`text-sm font-semibold tracking-wide uppercase ${titleClassName}`}
        >
          {title}
        </h2>
        <span className="text-xs font-normal tracking-normal text-gray-400 normal-case">
          ({count})
        </span>
      </Button>
      {open && children}
    </section>
  );
}

function DailyOverview() {
  const { t } = useTranslation();
  const now = new Date();
  const tz = getLocalTimeZone();
  const todayDate = today(tz);

  function toCalendarDate(d: Date): CalendarDate {
    return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
  }
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks", "today"],
    queryFn: () =>
      window.api.tasks.list({ status: "open" }) as Promise<TaskRow[]>,
    refetchInterval: 60_000,
  });

  const { data: allLabels = [] } = useQuery({
    queryKey: ["labels"],
    queryFn: () => window.api.labels.list() as Promise<LabelRow[]>,
  });

  function invalidateTasks() {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const markDoneMutation = useMutation({
    mutationFn: (taskId: number) => window.api.tasks.markDone(taskId),
    onSuccess: invalidateTasks,
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      window.api.tasks.update(id, { name }),
    onSuccess: invalidateTasks,
  });

  const planMutation = useMutation({
    mutationFn: ({ id, date }: { id: number; date: string | null }) =>
      window.api.tasks.plan(id, date),
    onSuccess: invalidateTasks,
  });

  const setRecurrenceMutation = useMutation({
    mutationFn: ({ id, rule }: { id: number; rule: string | null }) =>
      window.api.tasks.setRecurrence(id, rule),
    onSuccess: invalidateTasks,
  });

  const addLabelMutation = useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number; labelId: number }) =>
      window.api.tasks.update(taskId, { addLabelIds: [labelId] }),
    onSuccess: invalidateTasks,
  });

  const removeLabelMutation = useMutation({
    mutationFn: ({ taskId, labelId }: { taskId: number; labelId: number }) =>
      window.api.tasks.update(taskId, { removeLabelIds: [labelId] }),
    onSuccess: invalidateTasks,
  });

  function byScheduledAt(a: TaskRow, b: TaskRow) {
    return (a.scheduledAt?.getTime() ?? 0) - (b.scheduledAt?.getTime() ?? 0);
  }

  // Filter tasks and activities scheduled for today
  const todayTasks = tasks.filter((t) => {
    if (!t.scheduledAt) return false;
    return toCalendarDate(t.scheduledAt).compare(todayDate) === 0;
  });

  // Due now: no time component, or scheduled time in the past
  const dueNow = todayTasks
    .filter((t) => {
      if (!t.scheduledAt) return false;
      const d = t.scheduledAt;
      // If time is midnight (00:00), treat as "no specific time" → due now
      return d.getHours() === 0 && d.getMinutes() === 0 ? true : d <= now;
    })
    .sort(byScheduledAt);

  // Later today: future time
  const laterToday = todayTasks
    .filter((t) => {
      if (!t.scheduledAt) return false;
      const d = t.scheduledAt;
      return d.getHours() !== 0 && d > now;
    })
    .sort(byScheduledAt);

  // Overdue: scheduled before today (local date comparison)
  const overdue = tasks
    .filter((t) => {
      if (!t.scheduledAt) return false;
      return toCalendarDate(t.scheduledAt).compare(todayDate) < 0;
    })
    .sort(byScheduledAt);

  // Planned: scheduled after today (local date comparison)
  const planned = tasks
    .filter((t) => {
      if (!t.scheduledAt) return false;
      return toCalendarDate(t.scheduledAt).compare(todayDate) > 0;
    })
    .sort(byScheduledAt);

  const locale = i18n.language === "de" ? "de-DE" : "en-US";

  function renderCard(
    t: TaskRow,
    opts?: { dimmed?: boolean; scheduledTime?: string; overdue?: boolean },
  ) {
    const isActivity = t.taskType === "activity";
    return (
      <TaskCard
        key={t.id}
        id={t.id}
        name={t.name}
        project={t.project}
        labels={t.taskLabels.map((tl) => tl.label)}
        totalMinutes={calcTotalMinutes(t.slots)}
        isActivity={isActivity}
        scheduledAt={t.scheduledAt}
        recurrenceRule={t.recurrenceRule}
        onMarkDone={() => markDoneMutation.mutate(t.id)}
        allLabels={allLabels}
        onRename={(name) => renameMutation.mutate({ id: t.id, name })}
        onPlan={(date) => planMutation.mutate({ id: t.id, date })}
        onSetRecurrence={
          isActivity
            ? (rule) => setRecurrenceMutation.mutate({ id: t.id, rule })
            : undefined
        }
        onAddLabel={(labelId) =>
          addLabelMutation.mutate({ taskId: t.id, labelId })
        }
        onRemoveLabel={(labelId) =>
          removeLabelMutation.mutate({ taskId: t.id, labelId })
        }
        {...opts}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size={64} label={t("loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("dashboard.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {now.toLocaleDateString(locale, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Due now */}
      <CollapsibleSection title={t("dashboard.dueNow")} count={dueNow.length}>
        {dueNow.length === 0 ? (
          <p className="text-sm text-gray-400">{t("dashboard.noTasksToday")}</p>
        ) : (
          <div className="space-y-2">{dueNow.map((t) => renderCard(t))}</div>
        )}
      </CollapsibleSection>

      {/* Later today */}
      {laterToday.length > 0 && (
        <CollapsibleSection
          title={t("dashboard.laterToday")}
          count={laterToday.length}
        >
          <div className="space-y-2">
            {laterToday.map((t) =>
              renderCard(t, {
                dimmed: true,
                scheduledTime: t.scheduledAt?.toLocaleTimeString(locale, {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }),
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <CollapsibleSection
          title={t("dashboard.overdue")}
          count={overdue.length}
          titleClassName="text-red-500"
          defaultOpen={false}
        >
          <div className="space-y-2">
            {overdue.map((t) =>
              renderCard(t, {
                overdue: true,
                scheduledTime: t.scheduledAt?.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "short",
                }),
              }),
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Planned (future) */}
      {planned.length > 0 && (
        <CollapsibleSection
          title={t("dashboard.planned")}
          count={planned.length}
          defaultOpen={false}
        >
          <div className="space-y-2">
            {planned.map((t) =>
              renderCard(t, {
                dimmed: true,
                scheduledTime: t.scheduledAt?.toLocaleDateString(locale, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                }),
              }),
            )}
          </div>
        </CollapsibleSection>
      )}
    </div>
  );
}

export const Route = createFileRoute("/")({ component: DailyOverview });
