import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { Select, SelectItem } from "@horva/ui/Select";
import { TimeField } from "@horva/ui/TimeField";

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

  function handleKeyDownCapture(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      // Ignore Enter from portaled elements (e.g. Select dropdown)
      if (rowRef.current && !rowRef.current.contains(e.target as Node)) return;
      void save();
    }
    if (e.key === "Escape") onCancel();
  }

  const autoFocusStart = !prefillStart;
  const autoFocusEnd = prefillStart !== null && !prefillEnd;

  return (
    <tr
      ref={rowRef}
      className="bg-indigo-50/60"
      onKeyDownCapture={handleKeyDownCapture}
    >
      <td className="py-1 pr-2">
        <TimeField
          autoFocus={autoFocusStart}
          value={stringToTime(startTime) as never}
          onChange={(value) => {
            setStartTime(timeToString(value));
            setHasError(false);
          }}
          isInvalid={hasError && !startTime}
          className="w-24"
        />
      </td>
      <td className="py-1 pr-2">
        <TimeField
          autoFocus={autoFocusEnd}
          value={stringToTime(endTime) as never}
          onChange={(value) => {
            setEndTime(timeToString(value));
            setHasError(false);
          }}
          isInvalid={hasError && !!endTime}
          className="w-24"
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
        <Select
          autoFocus={!autoFocusStart && !autoFocusEnd}
          value={taskId === null ? "" : String(taskId)}
          onChange={(value) => setTaskId(value ? Number(value) : null)}
          aria-label={t("inlineNewSlotRow.noTask")}
          className="w-full"
        >
          <SelectItem id="">{t("inlineNewSlotRow.noTask")}</SelectItem>
          {allTasks.map((t) => (
            <SelectItem key={t.id} id={String(t.id)}>
              {t.project.name} / {t.name}
            </SelectItem>
          ))}
        </Select>
      </td>
      <td className="py-1 pl-2">
        <Button
          variant="quiet"
          onPress={onCancel}
          className="rounded p-0.5 text-gray-300 hover:text-gray-600"
          aria-label={t("inlineNewSlotRow.cancel")}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </td>
    </tr>
  );
}
