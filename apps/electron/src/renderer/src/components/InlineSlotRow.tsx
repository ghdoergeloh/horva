import type { KeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Select, SelectItem } from "@horva/ui/Select";
import { TimeField } from "@horva/ui/TimeField";

import { FormattedMs } from "~/components/FormattedMinutes.js";
import { LiveTime } from "~/components/LiveTime.js";
import {
  formatMinutesWithFormat,
  useTimeFormat,
} from "~/contexts/SettingsContext.js";
import { client } from "~/lib/orpc.js";
import { applyTimeString, fmt } from "~/lib/timeFormatters.js";

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
function stringToTime(value: string) {
  if (!value) return null;
  const [h, m] = value.split(":").map((s) => Number.parseInt(s, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return { hour: h, minute: m };
}

function timeToString(
  value: { hour?: number | null; minute?: number | null } | null,
): string {
  if (!value) return "";
  const hour = value.hour ?? 0;
  const minute = value.minute ?? 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export interface InlineSlotRowProps {
  slot: SlotRow;
  allTasks: TaskOption[];
  isEditing: boolean;
  onStartEdit: () => void;
  onEndEdit: () => void;
}

export function InlineSlotRow({
  slot,
  allTasks,
  isEditing,
  onStartEdit,
  onEndEdit,
}: InlineSlotRowProps) {
  const { t } = useTranslation();
  const timeFormat = useTimeFormat();
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState(fmt(slot.startedAt));
  const [endTime, setEndTime] = useState(slot.endedAt ? fmt(slot.endedAt) : "");
  const [taskId, setTaskId] = useState<number | null>(slot.taskId);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    if (isEditing) {
      setStartTime(fmt(slot.startedAt));
      setEndTime(slot.endedAt ? fmt(slot.endedAt) : "");
      setTaskId(slot.taskId);
      setConfirmDelete(false);
    }
  }, [isEditing, slot]);

  useEffect(() => {
    if (!isEditing) return;
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        void save();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, startTime, endTime, taskId]);

  async function save() {
    const changes: {
      id: number;
      startedAt?: Date;
      endedAt?: Date | null;
      taskId?: number | null;
    } = { id: slot.id };

    const startedAtIso = new Date(slot.startedAt).toISOString();
    const endedAtIso = slot.endedAt
      ? new Date(slot.endedAt).toISOString()
      : null;
    const newStart = applyTimeString(startedAtIso, startTime);
    if (newStart !== startedAtIso) changes.startedAt = new Date(newStart);

    if (endTime) {
      const newEnd = applyTimeString(startedAtIso, endTime);
      if (newEnd !== endedAtIso) changes.endedAt = new Date(newEnd);
    } else if (endedAtIso) {
      changes.endedAt = null;
    }

    if (taskId !== slot.taskId) changes.taskId = taskId;

    // Only fire if there's something to change beyond the id.
    if (Object.keys(changes).length > 1) {
      await client.slot.edit(changes);
      await queryClient.invalidateQueries({ queryKey: ["slots"] });
    }
    onEndEdit();
  }

  async function handleDelete() {
    await client.slot.delete({ id: slot.id });
    await queryClient.invalidateQueries({ queryKey: ["slots"] });
    onEndEdit();
  }

  function handleKeyDownCapture(e: KeyboardEvent) {
    if (e.key === "Enter") {
      // Ignore Enter from portaled elements (e.g. Select dropdown)
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) return;
      void save();
    }
    if (e.key === "Escape") onEndEdit();
  }

  const color = slot.task?.project.color ?? "#9ca3af";
  const taskName = slot.task
    ? slot.task.name
    : slot.state === "no_task"
      ? "—"
      : t("inlineSlotRow.deletedTask");

  if (!isEditing) {
    return (
      <tr
        className="group cursor-pointer hover:bg-gray-50"
        onClick={onStartEdit}
      >
        <td className="py-1.5 pr-4 font-mono text-gray-600">
          {fmt(slot.startedAt)}
        </td>
        <td className="py-1.5 pr-4 font-mono text-gray-600">
          {slot.endedAt ? fmt(slot.endedAt) : t("inlineSlotRow.running")}
        </td>
        <td className="py-1.5 pr-6 text-gray-700">
          {slot.endedAt ? (
            <FormattedMs
              ms={
                new Date(slot.endedAt).getTime() -
                new Date(slot.startedAt).getTime()
              }
            />
          ) : (
            <LiveTime startedAt={slot.startedAt} />
          )}
        </td>
        <td
          className="max-w-[240px] truncate py-1.5 pr-4 text-gray-800"
          title={taskName}
        >
          {taskName}
        </td>
        <td className="py-1.5">
          {slot.task ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs text-white"
              style={{ backgroundColor: color }}
            >
              {slot.task.project.name}
            </span>
          ) : null}
        </td>
        <td className="w-6" />
      </tr>
    );
  }

  return (
    <tr
      ref={rowRef}
      className="bg-indigo-50/60"
      onKeyDownCapture={handleKeyDownCapture}
    >
      <td className="py-1 pr-2">
        <TimeField
          autoFocus
          value={stringToTime(startTime) as never}
          onChange={(value) => setStartTime(timeToString(value))}
          className="w-20"
        />
      </td>
      <td className="py-1 pr-2">
        <TimeField
          value={stringToTime(endTime) as never}
          onChange={(value) => setEndTime(timeToString(value))}
          className="w-20"
        />
      </td>
      <td className="py-1 pr-6 text-xs text-gray-400">
        {endTime && startTime
          ? (() => {
              const start = applyTimeString(
                new Date(slot.startedAt).toISOString(),
                startTime,
              );
              const end = applyTimeString(
                new Date(slot.startedAt).toISOString(),
                endTime,
              );
              const ms = new Date(end).getTime() - new Date(start).getTime();
              return ms > 0
                ? formatMinutesWithFormat(Math.round(ms / 60000), timeFormat)
                : "–";
            })()
          : "–"}
      </td>
      <td className="py-1 pr-2" colSpan={2}>
        <Select
          value={taskId === null ? "" : String(taskId)}
          onChange={(value) => setTaskId(value ? Number(value) : null)}
          aria-label={t("inlineSlotRow.noTask")}
          className="w-full"
        >
          <SelectItem id="">{t("inlineSlotRow.noTask")}</SelectItem>
          {allTasks.map((t) => (
            <SelectItem key={t.id} id={String(t.id)}>
              {t.project.name} / {t.name}
            </SelectItem>
          ))}
        </Select>
      </td>
      <td className="py-1 pl-2">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button
              variant="destructive"
              onPress={() => void handleDelete()}
              className="px-1.5 py-0.5 text-xs"
            >
              {t("inlineSlotRow.delete")}
            </Button>
            <Button
              variant="quiet"
              onPress={() => setConfirmDelete(false)}
              className="px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>
        ) : (
          <Button
            variant="quiet"
            onPress={() => setConfirmDelete(true)}
            className="rounded p-0.5 text-gray-300 hover:text-red-500"
            aria-label={t("slot.deleteConfirm")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </td>
    </tr>
  );
}
