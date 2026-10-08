import type { Key, Selection } from "react-aria-components";
import { useState } from "react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Calendar, CalendarFooter } from "@horva/ui/Calendar";
import { Dialog } from "@horva/ui/Dialog";
import { Menu, MenuItem, MenuTrigger, SubmenuTrigger } from "@horva/ui/Menu";
import { Modal } from "@horva/ui/Modal";
import { Popover } from "@horva/ui/Popover";
import { TaskCard } from "@horva/ui/TaskCard";

import type { LabelRow } from "#/components/TaskEditControls.js";
import { RecurrenceRulePicker } from "#/components/RecurrenceRulePicker.js";
import { useActiveSlot } from "#/contexts/ActiveSlotContext.js";
import { useDetailDrawer } from "#/contexts/DetailDrawerContext.js";
import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";
import { client } from "#/lib/orpc.js";
import {
  calcTotalMinutes,
  formatScheduledDate,
  labelChanges,
  onDayKeepingTime,
  scheduleState,
} from "#/lib/taskUtils.js";

/** A task as the task lists load it. */
export type TaskRow = Awaited<
  ReturnType<typeof client.task.list>
>["tasks"][number];

/**
 * A task or activity of the task lists, as the `TaskCard` of `@horva/ui`.
 * The card saves its own changes: done, start and stop, the date, labels
 * and the recurrence of an activity.
 */
export function TaskListCard({
  task,
  allLabels,
  onReopened,
}: {
  task: TaskRow;
  allLabels: LabelRow[];
  /** Called after a done task was opened again. */
  onReopened?: () => void;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const timeFormat = useTimeFormat();
  const { openSlot, invalidate: invalidateSlots } = useActiveSlot();
  const { openTask } = useDetailDrawer();
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);

  const id = task.id;
  const isActivity = task.taskType === "activity";
  const isDone = task.status === "done";
  const isRunning = openSlot?.task?.id === id;
  const scheduledAt = task.scheduledAt ? new Date(task.scheduledAt) : null;
  const schedule = scheduleState(scheduledAt);
  const isPlannedToday = schedule.isPlannedToday;
  const isOverdue = schedule.isOverdue && !isDone && !isActivity;
  const totalMinutes = calcTotalMinutes(task.slots);
  const assigned = new Set(task.taskLabels.map(({ label }) => label.id));

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ["tasks"] });
  }

  const doneMutation = useMutation({
    mutationFn: (done: boolean) =>
      done ? client.task.done({ id }) : client.task.reopen({ id }),
    onSuccess: (_result, done) => {
      invalidate();
      // Ticking off a running task stops its slot.
      void invalidateSlots();
      if (!done) onReopened?.();
    },
  });

  const slotMutation = useMutation({
    mutationFn: (start: boolean) =>
      start ? client.slot.start({ taskId: id }) : client.slot.stop({}),
    onSuccess: () => void invalidateSlots(),
  });

  const planMutation = useMutation({
    mutationFn: (date: Date | null) => client.task.plan({ id, date }),
    onSuccess: invalidate,
  });

  const updateMutation = useMutation({
    mutationFn: (input: Omit<Parameters<typeof client.task.update>[0], "id">) =>
      client.task.update({ id, ...input }),
    onSuccess: invalidate,
  });

  function setLabels(selection: Selection) {
    if (selection === "all") return;
    const changes = labelChanges(assigned, new Set([...selection].map(Number)));
    if (changes.addLabelIds.length + changes.removeLabelIds.length > 0)
      updateMutation.mutate(changes);
  }

  function onAction(key: Key) {
    if (key === "details") openTask(id);
    if (key === "recurrence") setRecurrenceOpen(true);
  }

  const tz = getLocalTimeZone();
  const datePopover = (
    <Popover placement="bottom start" className="p-3">
      <Dialog aria-label={t("taskList.chooseDate")} className="p-0 outline-0">
        {({ close }) => {
          const pick = (date: CalendarDate | null) => {
            planMutation.mutate(
              date ? onDayKeepingTime(date, scheduledAt) : null,
            );
            close();
          };
          return (
            <>
              <Calendar
                aria-label={t("taskList.chooseDate")}
                value={
                  scheduledAt
                    ? new CalendarDate(
                        scheduledAt.getFullYear(),
                        scheduledAt.getMonth() + 1,
                        scheduledAt.getDate(),
                      )
                    : null
                }
                onChange={pick}
              />
              {/* Outside the calendar: its buttons need a slot there. */}
              <CalendarFooter>
                <div className="flex gap-1">
                  <Button
                    variant="quiet"
                    size="sm"
                    onPress={() => pick(today(tz))}
                  >
                    {t("taskList.planToday")}
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    onPress={() => pick(today(tz).add({ days: 1 }))}
                  >
                    {t("taskList.tomorrow")}
                  </Button>
                </div>
                {scheduledAt && (
                  <Button
                    variant="quiet"
                    size="sm"
                    className="text-destructive"
                    onPress={() => pick(null)}
                  >
                    {t("taskList.removeDate")}
                  </Button>
                )}
              </CalendarFooter>
            </>
          );
        }}
      </Dialog>
    </Popover>
  );

  const actions = (
    <MenuTrigger placement="bottom end">
      <Button variant="quiet" size="sm" aria-label={t("taskList.more")}>
        <MoreHorizontal aria-hidden />
      </Button>
      <Menu onAction={onAction}>
        <MenuItem id="details">{t("taskList.openDetails")}</MenuItem>
        {allLabels.length > 0 && (
          <SubmenuTrigger>
            <MenuItem id="labels">{t("taskList.labels")}</MenuItem>
            <Menu
              aria-label={t("taskList.labels")}
              selectionMode="multiple"
              selectedKeys={[...assigned].map(String)}
              onSelectionChange={setLabels}
            >
              {allLabels.map((label) => (
                <MenuItem key={label.id} id={String(label.id)}>
                  {label.name}
                </MenuItem>
              ))}
            </Menu>
          </SubmenuTrigger>
        )}
        {isActivity && (
          <MenuItem id="recurrence">{t("taskList.recurrence")}</MenuItem>
        )}
      </Menu>
    </MenuTrigger>
  );

  return (
    <>
      <TaskCard
        title={task.name}
        kind={isActivity ? "activity" : "task"}
        isDone={isDone}
        isRunning={isRunning}
        isOverdue={isOverdue}
        project={task.project}
        labels={task.taskLabels.map(({ label }) => label.name)}
        totalMinutes={totalMinutes > 0 ? totalMinutes : undefined}
        formatDuration={(minutes) =>
          formatMinutesWithFormat(minutes, timeFormat)
        }
        dateLabel={scheduledAt ? formatScheduledDate(scheduledAt) : null}
        isPlannedToday={isPlannedToday}
        onToggleDone={(done) => doneMutation.mutate(done)}
        onActivityDone={
          isActivity ? () => doneMutation.mutate(true) : undefined
        }
        onStart={() => slotMutation.mutate(true)}
        onStop={() => slotMutation.mutate(false)}
        onPlanToday={() =>
          planMutation.mutate(onDayKeepingTime(today(tz), scheduledAt))
        }
        datePopover={datePopover}
        actions={isDone ? undefined : actions}
        strings={{
          markDone: t("taskList.markDone"),
          reopen: t("taskList.reopen"),
          start: t("taskList.start"),
          stop: t("taskList.stop"),
          planToday: t("taskList.planToday"),
          noDate: t("taskList.noDate"),
          date: t("taskList.date"),
          overdue: t("taskList.overdue"),
          activity: t("taskList.activity"),
          activityDone: t("taskList.activityDone"),
          running: t("taskList.running"),
          total: t("taskList.total"),
        }}
      />
      {isActivity && (
        <Modal isOpen={recurrenceOpen} onOpenChange={setRecurrenceOpen}>
          <Dialog aria-label={t("taskList.recurrenceTitle")}>
            {({ close }) => (
              <RecurrenceDialogBody
                rule={task.recurrenceRule}
                scheduledAt={scheduledAt}
                onSave={(rule) => {
                  updateMutation.mutate({ recurrenceRule: rule });
                  close();
                }}
                onCancel={close}
              />
            )}
          </Dialog>
        </Modal>
      )}
    </>
  );
}

/** The recurrence of an activity, saved only with "Save". */
function RecurrenceDialogBody({
  rule,
  scheduledAt,
  onSave,
  onCancel,
}: {
  rule: string | null;
  scheduledAt: Date | null;
  onSave: (rule: string | null) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(rule);
  return (
    <>
      <h2 className="text-title text-foreground mb-4">
        {t("taskList.recurrenceTitle")}
      </h2>
      <RecurrenceRulePicker
        value={draft}
        scheduledAt={scheduledAt}
        onChange={setDraft}
      />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onPress={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button onPress={() => onSave(draft)}>{t("common.save")}</Button>
      </div>
    </>
  );
}
