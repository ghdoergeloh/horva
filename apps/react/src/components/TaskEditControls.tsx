import type { KeyboardEvent } from "react";
import { useRef, useState } from "react";
import { Tag } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

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
    if (!ref.current?.contains(e.relatedTarget)) setOpen(false);
  }

  if (allLabels.length === 0) return null;

  return (
    <div ref={ref} className="relative shrink-0" onBlur={handleBlur}>
      <Button
        variant="quiet"
        onPress={() => setOpen((v) => !v)}
        className="text-muted-foreground/70 hover:text-muted-foreground flex items-center rounded p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 focus-visible:opacity-100"
        aria-label={t("taskEditControls.editLabels")}
      >
        <Tag className="h-3.5 w-3.5" />
      </Button>

      {open && (
        <div className="border-border bg-card absolute right-0 bottom-full z-20 mb-1 min-w-36 rounded-lg border py-1 shadow-lg">
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
                className="hover:bg-background flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm"
              >
                <span
                  className={`h-2 w-2 shrink-0 rounded-full border ${
                    assigned ? "border-primary bg-primary" : "border-border"
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
      // oxlint-disable-next-line jsx-a11y/no-autofocus -- The input replaces the name that the user just clicked.
      autoFocus
      value={value}
      onChange={onChange}
      onBlur={onCommit}
      onKeyDown={handleKeyDown}
      className="w-full"
    />
  );
}
