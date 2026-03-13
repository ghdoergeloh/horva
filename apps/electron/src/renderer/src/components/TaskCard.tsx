import { useState } from "react";
import { Circle, Pause, Play, Repeat } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { LabelRow } from "~/components/TaskEditControls.js";
import {
  InlineRenameInput,
  LabelPicker,
  PlanButton,
} from "~/components/TaskEditControls.js";
import { useActiveSlot } from "~/contexts/ActiveSlotContext.js";

interface TaskCardProps {
  id: number;
  name: string;
  project: { name: string; color: string };
  labels?: LabelRow[];
  totalMinutes?: number;
  dimmed?: boolean;
  scheduledTime?: string | null;
  scheduledDate?: Date | string | null;
  isActivity?: boolean;
  overdue?: boolean;
  onMarkDone?: () => void;
  // Optional editing
  allLabels?: LabelRow[];
  onRename?: (name: string) => void;
  onPlan?: (date: string | null) => void;
  onAddLabel?: (labelId: number) => void;
  onRemoveLabel?: (labelId: number) => void;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${String(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${String(h)}h ${String(m)}m` : `${String(h)}h`;
}

export function TaskCard({
  id,
  name,
  project,
  labels = [],
  totalMinutes = 0,
  dimmed = false,
  scheduledTime,
  scheduledDate,
  isActivity = false,
  overdue = false,
  onMarkDone,
  allLabels,
  onRename,
  onPlan,
  onAddLabel,
  onRemoveLabel,
}: TaskCardProps) {
  const { t } = useTranslation();
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
        <button
          onClick={onMarkDone}
          title={
            isActivity ? t("taskCard.removeFromToday") : t("taskCard.markDone")
          }
          className="flex-shrink-0 text-gray-300 hover:text-green-500"
        >
          {isActivity ? (
            <Repeat className="h-5 w-5" />
          ) : (
            <Circle className="h-5 w-5" />
          )}
        </button>
      )}

      {/* Project color bar */}
      <div
        className={`h-8 w-1 flex-shrink-0 rounded-full ${isRunning ? "animate-pulse" : ""}`}
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
              {t("taskCard.totalTime", { time: formatMinutes(totalMinutes) })}
            </span>
          )}
        </div>
      </div>

      {/* Edit controls (label picker + plan button) — only when editing is enabled */}
      {canEdit && (
        <div className="flex flex-shrink-0 items-center gap-1">
          {allLabels && onAddLabel && onRemoveLabel && (
            <LabelPicker
              assignedLabelIds={assignedLabelIds}
              allLabels={allLabels}
              onAdd={onAddLabel}
              onRemove={onRemoveLabel}
            />
          )}
          {onPlan && (
            <PlanButton scheduledDate={scheduledDate ?? null} onPlan={onPlan} />
          )}
        </div>
      )}

      {/* Start / Stop button */}
      {isRunning ? (
        <button
          onClick={() => void handleStop()}
          className="flex w-20 flex-shrink-0 items-center justify-center gap-1 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100"
        >
          <Pause className="h-3 w-3" />
          {t("taskCard.pause")}
        </button>
      ) : (
        <button
          onClick={() => void handleStart()}
          className="flex w-20 flex-shrink-0 items-center justify-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-indigo-700"
        >
          <Play className="h-3 w-3" />
          {t("taskCard.start")}
        </button>
      )}
    </div>
  );
}
