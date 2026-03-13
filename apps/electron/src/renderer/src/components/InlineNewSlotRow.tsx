import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { applyTimeString, fmt, fmtDuration } from "~/lib/timeFormatters.js";

interface TaskOption {
  id: number;
  name: string;
  project: { name: string; color: string };
}

export interface InlineNewSlotRowProps {
  prefillStart: Date | null;
  prefillEnd: Date | null;
  referenceDate: Date;
  allTasks: TaskOption[];
  onCancel: () => void;
  onSaved: () => void;
}

export function InlineNewSlotRow({
  prefillStart,
  prefillEnd,
  referenceDate,
  allTasks,
  onCancel,
  onSaved,
}: InlineNewSlotRowProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState(
    prefillStart ? fmt(prefillStart) : "",
  );
  const [endTime, setEndTime] = useState(prefillEnd ? fmt(prefillEnd) : "");
  const [taskId, setTaskId] = useState<number | null>(null);
  const [hasError, setHasError] = useState(false);
  const rowRef = useRef<HTMLTableRowElement>(null);

  const refIso = referenceDate.toISOString();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) {
        onCancel();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onCancel]);

  async function save() {
    if (!startTime) {
      setHasError(true);
      return;
    }
    const startIso = applyTimeString(refIso, startTime);
    const endIso = endTime ? applyTimeString(refIso, endTime) : null;
    if (endIso && new Date(endIso) <= new Date(startIso)) {
      setHasError(true);
      return;
    }
    setHasError(false);
    console.log("insert", { startIso, endIso, taskId });
    await window.api.slots.insert(startIso, endIso, taskId);
    await queryClient.invalidateQueries({ queryKey: ["slots"] });
    onSaved();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      save().catch((err: unknown) => console.error("insert failed", err));
    }
    if (e.key === "Escape") onCancel();
  }

  const autoFocusStart = !prefillStart;
  const autoFocusEnd = prefillStart !== null && !prefillEnd;

  return (
    <tr ref={rowRef} className="bg-indigo-50/60">
      <td className="py-1 pr-2">
        <input
          autoFocus={autoFocusStart}
          type="time"
          value={startTime}
          onChange={(e) => {
            setStartTime(e.target.value);
            setHasError(false);
          }}
          onKeyDown={handleKeyDown}
          className={`w-24 rounded border bg-white px-1.5 py-0.5 font-mono text-sm outline-none focus:ring-1 ${hasError && !startTime ? "border-red-400 focus:ring-red-400" : "border-indigo-300 focus:ring-indigo-400"}`}
        />
      </td>
      <td className="py-1 pr-2">
        <input
          autoFocus={autoFocusEnd}
          type="time"
          value={endTime}
          onChange={(e) => {
            setEndTime(e.target.value);
            setHasError(false);
          }}
          onKeyDown={handleKeyDown}
          className={`w-24 rounded border bg-white px-1.5 py-0.5 font-mono text-sm outline-none focus:ring-1 ${hasError && endTime ? "border-red-400 focus:ring-red-400" : "border-indigo-300 focus:ring-indigo-400"}`}
        />
      </td>
      <td className="py-1 pr-6 text-xs text-gray-400">
        {startTime && endTime
          ? (() => {
              const ms =
                new Date(applyTimeString(refIso, endTime)).getTime() -
                new Date(applyTimeString(refIso, startTime)).getTime();
              return ms > 0 ? fmtDuration(ms) : "–";
            })()
          : "–"}
      </td>
      <td className="py-1 pr-2" colSpan={2}>
        <select
          autoFocus={!autoFocusStart && !autoFocusEnd}
          value={taskId ?? ""}
          onChange={(e) =>
            setTaskId(e.target.value ? Number(e.target.value) : null)
          }
          onKeyDown={handleKeyDown}
          className="w-full rounded border border-indigo-300 bg-white px-1.5 py-0.5 text-sm outline-none focus:ring-1 focus:ring-indigo-400"
        >
          <option value="">{t("inlineNewSlotRow.noTask")}</option>
          {allTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.project.name} / {t.name}
            </option>
          ))}
        </select>
      </td>
      <td className="py-1 pl-2">
        <button
          onClick={onCancel}
          className="rounded p-0.5 text-gray-300 hover:text-gray-600"
          title={t("inlineNewSlotRow.cancel")}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </td>
    </tr>
  );
}
