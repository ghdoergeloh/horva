import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Tag, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@horva/ui/Button";
import { TextField } from "@horva/ui/TextField";

import type { LabelRow } from "~/components/TaskEditControls.js";
import { LoadingSpinner } from "~/components/LoadingSpinner.js";

interface TaskRow {
  id: number;
  taskLabels: { label: { id: number; name: string } }[];
}

function LabelsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ["labels"],
    queryFn: () => window.api.labels.list() as Promise<LabelRow[]>,
  });

  const { data: allTasksForCounts = [] } = useQuery({
    queryKey: ["tasks", "forLabelCounts"],
    queryFn: () =>
      window.api.tasks.list({
        includeStatuses: ["open", "done", "archived"],
      }) as Promise<TaskRow[]>,
  });

  const labelTaskCounts = new Map<number, number>();
  for (const label of labels) {
    labelTaskCounts.set(label.id, 0);
  }
  for (const task of allTasksForCounts) {
    for (const { label } of task.taskLabels) {
      const count = labelTaskCounts.get(label.id);
      if (count === undefined) continue;
      labelTaskCounts.set(label.id, count + 1);
    }
  }

  const createLabelMutation = useMutation({
    mutationFn: (name: string) => window.api.labels.create(name),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["labels"] }),
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id: number) => window.api.labels.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["labels"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size={64} label={t("loading")} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          {t("labels.title")}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {labels.length === 1
            ? t("labels.countSingular", { count: labels.length })
            : t("labels.countPlural", { count: labels.length })}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {labels.length > 0 && (
          <div className="divide-y divide-gray-50 px-1 py-1">
            {labels.map((label) => {
              const count = labelTaskCounts.get(label.id);
              return (
                <div
                  key={label.id}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                >
                  <Tag className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                  <span className="flex-1 text-sm text-gray-800">
                    {label.name}
                  </span>
                  {count !== undefined && (
                    <span className="text-xs text-gray-400">
                      {t("labels.tasks", { count })}
                    </span>
                  )}
                  {confirmDeleteId === label.id ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">
                        {t("labels.deleteConfirm")}
                      </span>
                      <Button
                        variant="destructive"
                        onPress={() => {
                          deleteLabelMutation.mutate(label.id);
                          setConfirmDeleteId(null);
                        }}
                        className="rounded px-1.5 py-0.5 text-xs"
                      >
                        {t("labels.yes")}
                      </Button>
                      <Button
                        variant="quiet"
                        onPress={() => setConfirmDeleteId(null)}
                        className="rounded p-0.5"
                        aria-label={t("labels.cancelDelete")}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="quiet"
                      onPress={() => setConfirmDeleteId(label.id)}
                      className="text-gray-300 hover:text-red-400"
                      aria-label={t("labels.deleteTitle")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div
          className={`flex items-center gap-2 px-3 py-2 ${labels.length > 0 ? "border-t border-gray-50" : ""}`}
        >
          <TextField
            value={newName}
            onChange={setNewName}
            placeholder={t("labels.newPlaceholder")}
            className="min-w-0 flex-1"
          />
          <Button
            variant="quiet"
            isDisabled={!newName.trim()}
            aria-label={t("labels.createTitle")}
            onPress={() => {
              const trimmed = newName.trim();
              if (!trimmed) return;
              createLabelMutation.mutate(trimmed);
              setNewName("");
            }}
            className="flex-shrink-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/labels")({ component: LabelsPage });
