import type { CalendarDate } from "@internationalized/date";
import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { parseDate } from "@internationalized/date";
import { Sun, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@repo/ui/Button";
import { DatePicker } from "@repo/ui/DatePicker";
import { TextField } from "@repo/ui/TextField";

import { localDateStr } from "~/lib/dateUtils.js";
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
    <div ref={ref} className="relative shrink-0" onBlur={handleBlur}>
      <Button
        variant="quiet"
        onPress={() => setOpen((v) => !v)}
        className="flex items-center rounded p-0.5 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-500"
        aria-label={t("taskEditControls.editLabels")}
      >
        <Tag className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div className="absolute right-0 bottom-full z-20 mb-1 min-w-36 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {allLabels.map((label) => {
            const assigned = assignedLabelIds.includes(label.id);
            return (
              <Button
                key={label.id}
                variant="quiet"
                onPress={() => {
                  if (assigned) {
                    onRemove(label.id);
                  } else {
                    onAdd(label.id);
                  }
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full border ${
                    assigned
                      ? "border-indigo-500 bg-indigo-500"
                      : "border-gray-300"
                  }`}
                />
                {label.name}
              </Button>
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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const closeActionRef = useRef<"none" | "commit" | "cancel">("none");

  const dateInputValue = scheduledDate ? toDateInputValue(scheduledDate) : null;

  const pickerValue: CalendarDate | null =
    dateInputValue !== null ? parseDate(dateInputValue) : null;
  const [draftValue, setDraftValue] = useState<CalendarDate | null>(
    pickerValue,
  );

  function commitAndClose() {
    closeActionRef.current = "commit";
    const next = draftValue === null ? null : draftValue.toString(); // 'YYYY-MM-DD'
    if (next !== dateInputValue) onPlan(next);
    setOpen(false);
  }

  function cancelAndClose() {
    closeActionRef.current = "cancel";
    setDraftValue(pickerValue);
    setOpen(false);
  }

  return (
    <div
      ref={ref}
      className="relative flex shrink-0 items-center gap-1"
      onKeyDownCapture={(e) => {
        if (!open) return;
        const target = e.target as HTMLElement | null;
        if (target?.closest("[data-plan-today='true']")) return;

        if (e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          commitAndClose();
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          cancelAndClose();
        }
      }}
    >
      {!open ? (
        <Button
          variant="quiet"
          onPress={() => {
            closeActionRef.current = "none";
            setDraftValue(pickerValue);
            setOpen(true);
          }}
          className="h-7 px-2 text-[11px] text-gray-500 hover:text-gray-700"
          aria-label={t("taskEditControls.planDate")}
        >
          {scheduledDate
            ? formatScheduledDate(scheduledDate)
            : t("taskEditControls.planDate")}
        </Button>
      ) : (
        <DatePicker<CalendarDate>
          aria-label={t("taskEditControls.planDate")}
          value={draftValue}
          onChange={setDraftValue}
          onBlur={() => {
            commitAndClose();
          }}
          autoFocus
          className="text-xs"
        />
      )}
      <Button
        data-plan-today="true"
        variant="quiet"
        onPress={() => {
          onPlan(localDateStr(new Date()));
          setOpen(false);
        }}
        className="h-7 w-7 p-0 text-amber-500 hover:text-amber-600"
        aria-label={t("taskEditControls.planToday")}
      >
        <Sun className="h-3.5 w-3.5" />
      </Button>
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
    <TextField
      autoFocus
      value={value}
      onChange={onChange}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      className="w-full"
    />
  );
}
