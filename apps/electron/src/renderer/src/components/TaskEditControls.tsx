import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { CalendarClock, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatScheduledDate, toDateInputValue } from "~/lib/taskUtils.js";

export interface LabelRow {
  id: number;
  name: string;
}

// ── LabelPicker ───────────────────────────────────────────────────────────────

interface LabelPickerProps {
  assignedLabelIds: number[];
  allLabels: LabelRow[];
  onAdd: (labelId: number) => void;
  onRemove: (labelId: number) => void;
}

export function LabelPicker({
  assignedLabelIds,
  allLabels,
  onAdd,
  onRemove,
}: LabelPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  function handleBlur(e: React.FocusEvent) {
    if (!ref.current?.contains(e.relatedTarget as Node)) setOpen(false);
  }

  if (allLabels.length === 0) return null;

  return (
    <div ref={ref} className="relative flex-shrink-0" onBlur={handleBlur}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={t("taskEditControls.editLabels")}
        className="flex items-center rounded p-0.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-500"
      >
        <Tag className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute right-0 bottom-full z-20 mb-1 min-w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {allLabels.map((label) => {
            const assigned = assignedLabelIds.includes(label.id);
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => {
                  if (assigned) {
                    onRemove(label.id);
                  } else {
                    onAdd(label.id);
                  }
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
              >
                <span
                  className={`h-2 w-2 flex-shrink-0 rounded-full border ${
                    assigned
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-300"
                  }`}
                />
                {label.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── PlanButton ────────────────────────────────────────────────────────────────

interface PlanButtonProps {
  scheduledDate: Date | string | null;
  onPlan: (date: string | null) => void;
}

export function PlanButton({ scheduledDate, onPlan }: PlanButtonProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().slice(0, 10);
  const isScheduledToday = scheduledDate
    ? toDateInputValue(scheduledDate) === today
    : false;

  return (
    <div className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => inputRef.current?.showPicker()}
        title={
          scheduledDate
            ? t("taskEditControls.planned", {
                date: formatScheduledDate(scheduledDate),
              })
            : t("taskEditControls.planDate")
        }
        className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-gray-100 ${
          scheduledDate
            ? isScheduledToday
              ? "text-indigo-600"
              : "text-amber-600"
            : "text-gray-300 opacity-0 group-hover:opacity-100"
        }`}
      >
        <CalendarClock className="h-3.5 w-3.5" />
        {scheduledDate && <span>{formatScheduledDate(scheduledDate)}</span>}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={toDateInputValue(scheduledDate)}
        onChange={(e) => onPlan(e.target.value || null)}
        className="pointer-events-none absolute opacity-0"
        tabIndex={-1}
      />
    </div>
  );
}

// ── InlineRenameInput ─────────────────────────────────────────────────────────

interface InlineRenameInputProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

export function InlineRenameInput({
  value,
  onChange,
  onCommit,
  onCancel,
}: InlineRenameInputProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") onCommit();
    else if (e.key === "Escape") onCancel();
  }

  return (
    <input
      autoFocus
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      className="w-full rounded border border-indigo-300 bg-white px-1 py-0.5 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-indigo-400"
    />
  );
}
