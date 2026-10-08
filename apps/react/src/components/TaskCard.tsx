import type { TFunction } from "i18next";
import type { Selection } from "react-aria-components";
import { useId, useState } from "react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { MoreHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Calendar } from "@horva/ui/Calendar";
import { Dialog } from "@horva/ui/Dialog";
import { Form } from "@horva/ui/Form";
import { Menu, MenuItem, MenuTrigger, SubmenuTrigger } from "@horva/ui/Menu";
import { Modal } from "@horva/ui/Modal";
import { Popover } from "@horva/ui/Popover";
import { TaskCard as HorvaTaskCard } from "@horva/ui/TaskCard";
import { TextField } from "@horva/ui/TextField";

import type { LabelRow } from "#/components/TaskEditControls.js";
import { RecurrenceRulePicker } from "#/components/RecurrenceRulePicker.js";
import { useActiveSlot } from "#/contexts/ActiveSlotContext.js";
import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "#/contexts/SettingsContext.js";
import { startOfDay } from "#/lib/dateUtils.js";
import { client } from "#/lib/orpc.js";
import { formatScheduledDate } from "#/lib/taskUtils.js";

interface TaskCardProps {
  id: number;
  name: string;
  project: { name: string; color: string };
  labels?: LabelRow[];
  totalMinutes?: number;
  dimmed?: boolean;
  /** Text of the date chip; by default it comes from `scheduledAt`. */
  scheduledTime?: string | null;
  scheduledAt?: Date | string | null;
  recurrenceRule?: string | null;
  isActivity?: boolean;
  isDone?: boolean;
  overdue?: boolean;
  /** Ticks a task off (or on again when done); takes an activity off today. */
  onMarkDone?: () => void;
  allLabels?: LabelRow[];
  onRename?: (name: string) => void;
  /** Plans the task for a date (ISO string), or removes the date (`null`). */
  onPlan?: (date: string | null) => void;
  onSetRecurrence?: (rule: string | null) => void;
  onAddLabel?: (labelId: number) => void;
  onRemoveLabel?: (labelId: number) => void;
  onOpenDetails?: () => void;
}

/** The texts of the card in the language of the app. */
function cardStrings(t: TFunction) {
  return {
    markDone: t("taskCard.markDone"),
    reopen: t("taskCard.reopen"),
    start: t("taskCard.start"),
    stop: t("taskCard.stop"),
    planToday: t("taskCard.planToday"),
    noDate: t("taskCard.noDate"),
    date: t("taskCard.date"),
    overdue: t("taskCard.overdue"),
    activity: t("taskCard.activity"),
    running: t("taskCard.running"),
    total: t("taskCard.total"),
  };
}

/** Whether a plan is for today, and the text of the date chip. */
function planState(
  scheduledAt: Date | string | null | undefined,
  scheduledTime: string | null | undefined,
) {
  if (!scheduledAt)
    return { isPlannedToday: false, dateLabel: scheduledTime ?? null };
  return {
    isPlannedToday:
      startOfDay(new Date(scheduledAt)).getTime() ===
      startOfDay(new Date()).getTime(),
    dateLabel: scheduledTime ?? formatScheduledDate(scheduledAt),
  };
}

function toCalendarDate(value: Date | string): CalendarDate {
  const d = new Date(value);
  return new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * A task or activity of the app as the `TaskCard` of `@horva/ui`: start
 * and stop through the running slot, "Today" and the date chip plan it,
 * and a menu holds rename, labels, recurrence and details.
 */
export function TaskCard({
  id,
  name,
  project,
  labels = [],
  totalMinutes = 0,
  dimmed = false,
  scheduledTime,
  scheduledAt,
  recurrenceRule,
  isActivity = false,
  isDone = false,
  overdue = false,
  onMarkDone,
  allLabels,
  onRename,
  onPlan,
  onSetRecurrence,
  onAddLabel,
  onRemoveLabel,
  onOpenDetails,
}: TaskCardProps) {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const { openSlot, invalidate } = useActiveSlot();
  const isRunning = openSlot?.task?.id === id;
  const [dialog, setDialog] = useState<"rename" | "recurrence" | null>(null);

  const { isPlannedToday, dateLabel } = planState(scheduledAt, scheduledTime);

  const [failed, setFailed] = useState<"start" | "stop" | null>(null);

  async function run(action: "start" | "stop") {
    setFailed(null);
    try {
      // Stop ends the work, like the stop of the timer.
      if (action === "start") await client.slot.start({ taskId: id });
      else await client.slot.done({});
      await invalidate();
    } catch {
      setFailed(action);
    }
  }

  function planToday() {
    const tz = getLocalTimeZone();
    onPlan?.(today(tz).toDate(tz).toISOString());
  }

  /** Moves the plan to another day and keeps its time of day. */
  function planOn(day: CalendarDate) {
    const next = scheduledAt ? new Date(scheduledAt) : new Date(0, 0, 1);
    next.setFullYear(day.year, day.month - 1, day.day);
    onPlan?.(next.toISOString());
  }

  const datePopover = onPlan ? (
    <Popover placement="bottom start">
      <Dialog aria-label={t("taskCard.pickDate")} className="p-3">
        {({ close }) => (
          <>
            <Calendar
              aria-label={t("taskCard.pickDate")}
              value={scheduledAt ? toCalendarDate(scheduledAt) : null}
              onChange={(day) => {
                planOn(day);
                close();
              }}
            />
            {scheduledAt && (
              <div className="border-border mt-2 border-t pt-2">
                <Button
                  variant="quiet"
                  size="sm"
                  onPress={() => {
                    onPlan(null);
                    close();
                  }}
                >
                  {t("taskCard.clearDate")}
                </Button>
              </div>
            )}
          </>
        )}
      </Dialog>
    </Popover>
  ) : undefined;

  const actions = (
    <CardMenu
      isActivity={isActivity}
      labels={labels}
      allLabels={onAddLabel && onRemoveLabel ? allLabels : undefined}
      onRename={onRename ? () => setDialog("rename") : undefined}
      onRecurrence={onSetRecurrence ? () => setDialog("recurrence") : undefined}
      onRemoveFromToday={isActivity ? onMarkDone : undefined}
      onAddLabel={onAddLabel}
      onRemoveLabel={onRemoveLabel}
      onOpenDetails={onOpenDetails}
    />
  );

  return (
    <>
      <HorvaTaskCard
        title={name}
        kind={isActivity ? "activity" : "task"}
        isDone={isDone}
        isRunning={isRunning}
        isOverdue={overdue}
        project={project}
        labels={labels.map((l) => l.name)}
        totalMinutes={totalMinutes}
        dateLabel={dateLabel}
        isPlannedToday={isPlannedToday}
        onToggleDone={isActivity ? undefined : onMarkDone}
        onStart={() => void run("start")}
        onStop={() => void run("stop")}
        onPlanToday={onPlan ? planToday : undefined}
        datePopover={datePopover}
        actions={actions}
        formatDuration={(minutes) =>
          formatMinutesWithFormat(minutes, timeFormat)
        }
        strings={cardStrings(t)}
        className={dimmed ? "opacity-60" : undefined}
      />
      {failed && (
        <p role="alert" className="text-destructive text-small mt-1">
          {failed === "start"
            ? t("startTaskDialog.failed")
            : t("slotBar.stopFailed")}
        </p>
      )}
      {onRename && dialog === "rename" && (
        <RenameDialog
          name={name}
          onClose={() => setDialog(null)}
          onRename={onRename}
        />
      )}
      {onSetRecurrence && dialog === "recurrence" && (
        <RecurrenceDialog
          recurrenceRule={recurrenceRule ?? null}
          scheduledAt={scheduledAt ? new Date(scheduledAt) : null}
          onClose={() => setDialog(null)}
          onSetRecurrence={onSetRecurrence}
        />
      )}
    </>
  );
}

/** The "more actions" menu of a card. Hidden when it would be empty. */
function CardMenu({
  isActivity,
  labels,
  allLabels,
  onRename,
  onRecurrence,
  onRemoveFromToday,
  onAddLabel,
  onRemoveLabel,
  onOpenDetails,
}: {
  isActivity: boolean;
  labels: LabelRow[];
  allLabels?: LabelRow[];
  onRename?: () => void;
  onRecurrence?: () => void;
  onRemoveFromToday?: () => void;
  onAddLabel?: (labelId: number) => void;
  onRemoveLabel?: (labelId: number) => void;
  onOpenDetails?: () => void;
}) {
  const { t } = useTranslation();
  const hasLabels = Boolean(allLabels && allLabels.length > 0);
  if (
    !onRename &&
    !onRecurrence &&
    !onRemoveFromToday &&
    !hasLabels &&
    !onOpenDetails
  )
    return null;

  const assigned = new Set(labels.map((l) => l.id));
  const actions: Record<string, (() => void) | undefined> = {
    rename: onRename,
    recurrence: onRecurrence,
    removeFromToday: onRemoveFromToday,
    details: onOpenDetails,
  };

  function onLabelsChange(selection: Selection) {
    if (selection === "all") return;
    for (const label of allLabels ?? []) {
      const selected = selection.has(label.id);
      if (selected && !assigned.has(label.id)) onAddLabel?.(label.id);
      if (!selected && assigned.has(label.id)) onRemoveLabel?.(label.id);
    }
  }

  return (
    <MenuTrigger placement="bottom end">
      <Button variant="quiet" size="sm" aria-label={t("taskCard.actions")}>
        <MoreHorizontal aria-hidden />
      </Button>
      <Menu onAction={(key) => actions[String(key)]?.()}>
        {onRename && <MenuItem id="rename">{t("taskCard.rename")}</MenuItem>}
        {hasLabels && (
          <SubmenuTrigger>
            <MenuItem id="labels">{t("taskCard.labels")}</MenuItem>
            <Menu
              aria-label={t("taskCard.labels")}
              selectionMode="multiple"
              selectedKeys={assigned}
              onSelectionChange={onLabelsChange}
              items={allLabels}
            >
              {(label) => <MenuItem id={label.id}>{label.name}</MenuItem>}
            </Menu>
          </SubmenuTrigger>
        )}
        {isActivity && onRecurrence && (
          <MenuItem id="recurrence">{t("taskCard.recurrence")}</MenuItem>
        )}
        {onRemoveFromToday && (
          <MenuItem id="removeFromToday">
            {t("taskCard.removeFromToday")}
          </MenuItem>
        )}
        {onOpenDetails && (
          <MenuItem id="details">{t("taskCard.openDetails")}</MenuItem>
        )}
      </Menu>
    </MenuTrigger>
  );
}

function RenameDialog({
  name,
  onClose,
  onRename,
}: {
  name: string;
  onClose: () => void;
  onRename: (name: string) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [value, setValue] = useState(name);

  return (
    <Modal
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog aria-labelledby={titleId}>
        <Form
          className="gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = value.trim();
            if (trimmed && trimmed !== name) onRename(trimmed);
            onClose();
          }}
        >
          <h2 id={titleId} className="text-title text-foreground">
            {t("taskCard.renameTitle")}
          </h2>
          <TextField
            // oxlint-disable-next-line jsx-a11y/no-autofocus -- The dialog opens on a user action. Focus goes to the field.
            autoFocus
            label={t("taskCard.name")}
            value={value}
            onChange={setValue}
            isRequired
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onPress={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isDisabled={!value.trim()}>
              {t("common.save")}
            </Button>
          </div>
        </Form>
      </Dialog>
    </Modal>
  );
}

function RecurrenceDialog({
  recurrenceRule,
  scheduledAt,
  onClose,
  onSetRecurrence,
}: {
  recurrenceRule: string | null;
  scheduledAt: Date | null;
  onClose: () => void;
  onSetRecurrence: (rule: string | null) => void;
}) {
  const { t } = useTranslation();
  const titleId = useId();
  const [draft, setDraft] = useState<string | null>(recurrenceRule);

  return (
    <Modal
      isDismissable
      isOpen
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog aria-labelledby={titleId}>
        <h2 id={titleId} className="text-title text-foreground mb-4">
          {t("taskCard.recurrenceModalTitle")}
        </h2>
        <RecurrenceRulePicker
          key={recurrenceRule ?? "new"}
          value={draft}
          scheduledAt={scheduledAt}
          onChange={setDraft}
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onPress={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            onPress={() => {
              onSetRecurrence(draft);
              onClose();
            }}
          >
            {t("common.save")}
          </Button>
        </div>
      </Dialog>
    </Modal>
  );
}
