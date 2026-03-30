import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@repo/ui/Button";
import { Select, SelectItem } from "@repo/ui/Select";
import { TimeField } from "@repo/ui/TimeField";

import { applyTimeString, fmt } from "~/lib/timeFormatters.js";

interface Slot {
  id: number;
  startedAt: Date | string;
  endedAt: Date | string | null;
  taskId: number | null;
  state: string;
}

interface EditSlotDialogProps {
  slot: Slot;
  onClose: () => void;
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

export function EditSlotDialog({ slot, onClose }: EditSlotDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [startTime, setStartTime] = useState(fmt(slot.startedAt));
  const [endTime, setEndTime] = useState(slot.endedAt ? fmt(slot.endedAt) : "");
  const [taskId, setTaskId] = useState<number | null>(slot.taskId);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", "open"],
    queryFn: () =>
      window.api.tasks.list({ status: "open" }) as Promise<TaskOption[]>,
  });

  async function handleSave() {
    setSaving(true);
    setWarning(null);
    try {
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

      const result = (await window.api.slots.edit(slot.id, changes)) as {
        updated: Slot;
        neighborAdjusted?: { id: number; field: string };
      };

      if (result.neighborAdjusted) {
        setWarning(
          t("slot.neighborAdjusted", { id: result.neighborAdjusted.id }),
        );
      }

      await queryClient.invalidateQueries({ queryKey: ["slots"] });
      if (!result.neighborAdjusted) onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            {t("slot.edit")}
          </h2>
          <Button
            variant="quiet"
            onPress={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100"
            aria-label={t("slot.cancel")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <TimeField
                label={t("slot.start")}
                value={stringToTime(startTime) as never}
                onChange={(value) => setStartTime(timeToString(value))}
                className="w-full"
              />
            </div>
            <div>
              <TimeField
                label={t("slot.end")}
                value={stringToTime(endTime) as never}
                onChange={(value) => setEndTime(timeToString(value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Task */}
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-700">
              {t("logTable.task")}
            </label>
            <Select
              value={taskId === null ? "" : String(taskId)}
              onChange={(value) => setTaskId(value ? Number(value) : null)}
              aria-label={t("logTable.task")}
            >
              <SelectItem id="">{t("slot.noTask")}</SelectItem>
              {tasks.map((t) => (
                <SelectItem key={t.id} id={String(t.id)}>
                  {t.project.name} / {t.name}
                </SelectItem>
              ))}
            </Select>
          </div>

          {/* Neighbor warning */}
          {warning && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              {warning}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {t("slot.deleteConfirm")}
              </span>
              <Button
                variant="destructive"
                onPress={async () => {
                  await window.api.slots.delete(slot.id);
                  await queryClient.invalidateQueries({ queryKey: ["slots"] });
                  onClose();
                }}
                className="px-3 py-2 text-sm font-medium"
              >
                {t("slot.delete")}
              </Button>
              <Button
                variant="secondary"
                onPress={() => setConfirmDelete(false)}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {t("slot.cancel")}
              </Button>
            </div>
          ) : (
            <Button
              variant="quiet"
              onPress={() => setConfirmDelete(true)}
              className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
              aria-label={t("slot.deleteConfirm")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}

          {!confirmDelete && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onPress={onClose}
                className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                {t("slot.cancel")}
              </Button>
              <Button
                variant="primary"
                onPress={() => void handleSave()}
                isDisabled={saving}
                className="px-3 py-2 text-sm font-medium"
              >
                {saving ? t("slot.saving") : t("slot.save")}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
