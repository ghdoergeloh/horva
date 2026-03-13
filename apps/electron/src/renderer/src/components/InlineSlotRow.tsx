import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { LiveTime } from "~/components/LiveTime.js";
import { applyTimeString, fmt, fmtDuration } from "~/lib/timeFormatters.js";

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
      startedAt?: string;
      endedAt?: string | null;
      taskId?: number | null;
    } = {};

    const startedAtIso = new Date(slot.startedAt).toISOString();
    const endedAtIso = slot.endedAt
      ? new Date(slot.endedAt).toISOString()
      : null;
    const newStart = applyTimeString(startedAtIso, startTime);
    if (newStart !== startedAtIso) changes.startedAt = newStart;

    if (endTime) {
      const newEnd = applyTimeString(startedAtIso, endTime);
      if (newEnd !== endedAtIso) changes.endedAt = newEnd;
    } else if (endedAtIso) {
      changes.endedAt = null;
    }

    if (taskId !== slot.taskId) changes.taskId = taskId;

    if (Object.keys(changes).length > 0) {
      await window.api.slots.edit(slot.id, changes);
      await queryClient.invalidateQueries({ queryKey: ["slots"] });
    }
    onEndEdit();
  }

  async function handleDelete() {
    await window.api.slots.delete(slot.id);
    await queryClient.invalidateQueries({ queryKey: ["slots"] });
    onEndEdit();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void save();
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
            fmtDuration(
              new Date(slot.endedAt).getTime() -
                new Date(slot.startedAt).getTime(),
            )
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
    <tr ref={rowRef} className="bg-indigo-50/60" onKeyDown={handleKeyDown}>
      <td className="py-1 pr-2">
        <input
          autoFocus
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          className="w-24 rounded border border-indigo-300 bg-white px-1.5 py-0.5 font-mono text-sm outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </td>
      <td className="py-1 pr-2">
        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="w-24 rounded border border-indigo-300 bg-white px-1.5 py-0.5 font-mono text-sm outline-none focus:ring-1 focus:ring-indigo-400"
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
              return ms > 0 ? fmtDuration(ms) : "–";
            })()
          : "–"}
      </td>
      <td className="py-1 pr-2" colSpan={2}>
        <select
          value={taskId ?? ""}
          onChange={(e) =>
            setTaskId(e.target.value ? Number(e.target.value) : null)
          }
          className="w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="">{t("inlineSlotRow.noTask")}</option>
          {allTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.project.name} / {t.name}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1 pl-2">
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => void handleDelete()}
              className="rounded bg-red-600 px-1.5 py-0.5 text-xs text-white hover:bg-red-700"
            >
              {t("inlineSlotRow.delete")}
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded px-1 py-0.5 text-xs text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded p-0.5 text-gray-300 hover:text-red-500"
            title={t("slot.deleteConfirm")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
