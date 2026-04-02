import { useState } from "react";
import { Circle, Pause, Play, RefreshCw, Repeat } from "lucide-react";
import { DialogTrigger, Heading } from "react-aria-components";
import { useTranslation } from "react-i18next";

import { Button } from "@repo/ui/Button";
import { Dialog } from "@repo/ui/Dialog";
import { Modal } from "@repo/ui/Modal";

import type { LabelRow } from "~/components/TaskEditControls.js";
import { RecurrenceRulePicker } from "~/components/RecurrenceRulePicker.js";
import {
  InlineRenameInput,
  LabelPicker,
  PlanButton,
} from "~/components/TaskEditControls.js";
import { useActiveSlot } from "~/contexts/ActiveSlotContext.js";
import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "~/contexts/SettingsContext.js";

interface TaskCardProps {
  id: number;
  name: string;
  project: { name: string; color: string };
  labels?: LabelRow[];
  totalMinutes?: number;
  dimmed?: boolean;
  scheduledTime?: string | null;
  scheduledAt?: Date | string | null;
  recurrenceRule?: string | null;
  isActivity?: boolean;
  overdue?: boolean;
  onMarkDone?: () => void;
  // Optional editing
  allLabels?: LabelRow[];
  onRename?: (name: string) => void;
  onPlan?: (date: string | null) => void;
  onSetRecurrence?: (rule: string | null) => void;
  onAddLabel?: (labelId: number) => void;
  onRemoveLabel?: (labelId: number) => void;
}

function RecurrenceModal({
  recurrenceRule,
  scheduledAt,
  onSetRecurrence,
}: {
  recurrenceRule: string | null | undefined;
  scheduledAt: Date | string | null | undefined;
  onSetRecurrence: (rule: string | null) => void;
}) {
  const { t } = useTranslation();
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null;
  return (
    <DialogTrigger>
      <Button
        variant="quiet"
        className={`shrink-0 rounded p-0.5 transition-colors ${
          recurrenceRule
            ? "text-indigo-400 hover:text-indigo-600"
            : "text-gray-300 opacity-0 group-hover:opacity-100 hover:text-indigo-400"
        }`}
        aria-label={t("taskCard.recurring")}
      >
        <RefreshCw className="h-3 w-3" />
      </Button>
      <Modal>
        <Dialog>
          {({ close }) => (
            <RecurrenceModalContent
              recurrenceRule={recurrenceRule ?? null}
              scheduledDate={scheduledDate}
              onSetRecurrence={onSetRecurrence}
              onClose={close}
            />
          )}
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}

function RecurrenceModalContent({
  recurrenceRule,
  scheduledDate,
  onSetRecurrence,
  onClose,
}: {
  recurrenceRule: string | null;
  scheduledDate: Date | null;
  onSetRecurrence: (rule: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(recurrenceRule);

  return (
    <>
      <Heading
        slot="title"
        className="mb-4 text-base font-semibold text-gray-900"
      >
        {t("taskCard.recurrenceModalTitle")}
      </Heading>
      <RecurrenceRulePicker
        value={draft}
        scheduledAt={scheduledDate}
        onChange={setDraft}
      />
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onPress={onClose}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="primary"
          onPress={() => {
            onSetRecurrence(draft);
            onClose();
          }}
        >
          {t("common.save")}
        </Button>
      </div>
    </>
  );
}

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
  overdue = false,
  onMarkDone,
  allLabels,
  onRename,
  onPlan,
  onSetRecurrence,
  onAddLabel,
  onRemoveLabel,
}: TaskCardProps) {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const { openSlot, invalidate } = useActiveSlot();
  const isRunning = openSlot?.task?.id === id;
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);

  const canEdit = Boolean(onRename ?? onPlan ?? allLabels);

  async function handleStart() {
    await window.api.slots.start(id);
    await invalidate();
  }

  async function handleStop() {
    await window.api.slots.stop();
    await invalidate();
  }

  function startEditing() {
    if (!onRename) return;
    setEditValue(name);
    setEditing(true);
  }

  function commitEdit() {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
    setEditing(false);
  }

  const assignedLabelIds = labels.map((l) => l.id);

  return (
    <div
      className={`group flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors hover:shadow-sm ${
        isRunning
          ? "border-indigo-300 ring-2 ring-indigo-200"
          : "border-gray-200 hover:border-gray-300"
      } ${dimmed ? "opacity-60" : ""}`}
    >
      {/* Done / unschedule button */}
      {onMarkDone && (
        <Button
          variant="quiet"
          onPress={onMarkDone}
          className="shrink-0 text-gray-300 hover:text-green-500"
          aria-label={
            isActivity ? t("taskCard.removeFromToday") : t("taskCard.markDone")
          }
        >
          {isActivity ? (
            <Repeat className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </Button>
      )}

      {/* Project color bar */}
      <div
        className={`h-8 w-1 shrink-0 rounded-full ${isRunning ? "animate-pulse" : ""}`}
        style={{ backgroundColor: project.color }}
      />

      {/* Task info */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <InlineRenameInput
            value={editValue}
            onChange={setEditValue}
            onCommit={commitEdit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex items-center gap-2">
            <span
              onClick={canEdit && onRename ? startEditing : undefined}
              title={onRename ? t("taskCard.clickToEdit") : undefined}
              className={`truncate text-sm font-medium text-gray-900 ${onRename ? "cursor-text hover:text-indigo-700" : ""}`}
            >
              {name}
            </span>
            {isActivity && onSetRecurrence && (
              <RecurrenceModal
                recurrenceRule={recurrenceRule}
                scheduledAt={scheduledAt}
                onSetRecurrence={onSetRecurrence}
              />
            )}
            {scheduledTime && (
              <span
                className={`text-xs ${overdue ? "font-medium text-red-500" : "text-gray-400"}`}
              >
                {scheduledTime}
              </span>
            )}
          </div>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          <span
            className="rounded px-1.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${project.color}22`,
              color: project.color,
            }}
          >
            {project.name}
          </span>
          {labels.map((l) => (
            <span
              key={l.id}
              className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
            >
              {l.name}
            </span>
          ))}
          {totalMinutes > 0 && (
            <span className="text-xs text-gray-400">
              {t("taskCard.totalTime", {
                time: formatMinutesWithFormat(totalMinutes, timeFormat),
              })}
            </span>
          )}
        </div>
      </div>

      {/* Edit controls (label picker + plan button) — only when editing is enabled */}
      {canEdit && (
        <div className="flex shrink-0 items-center gap-1">
          {allLabels && onAddLabel && onRemoveLabel && (
            <LabelPicker
              assignedLabelIds={assignedLabelIds}
              allLabels={allLabels}
              onAdd={onAddLabel}
              onRemove={onRemoveLabel}
            />
          )}
          {onPlan && (
            <PlanButton scheduledDate={scheduledAt ?? null} onPlan={onPlan} />
          )}
        </div>
      )}

      {/* Start / Stop button */}
      {isRunning ? (
        <Button
          variant="secondary"
          onPress={() => void handleStop()}
          className="w-24 shrink-0 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          <span className="inline-flex items-center justify-center gap-1">
            <Pause className="h-3 w-3" />
            {t("taskCard.pause")}
          </span>
        </Button>
      ) : (
        <Button
          variant="primary"
          onPress={() => void handleStart()}
          className="w-24 shrink-0 px-3 py-1.5 text-sm font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-indigo-700"
        >
          <span className="inline-flex items-center justify-center gap-1">
            <Play className="h-3 w-3" />
            {t("taskCard.start")}
          </span>
        </Button>
      )}
    </div>
  );
}
