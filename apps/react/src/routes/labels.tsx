import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Tag, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { AlertDialog } from "@horva/ui/AlertDialog";
import { Button } from "@horva/ui/Button";
import { Loader } from "@horva/ui/Logo";
import { Modal } from "@horva/ui/Modal";
import { TextField } from "@horva/ui/TextField";

import { client } from "#/lib/orpc.js";

interface LabelRow {
  id: number;
  name: string;
}

function LabelsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  // The label stays set while the dialog fades out, so its text stays.
  const [toDelete, setToDelete] = useState<LabelRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ["labels"],
    queryFn: async () => {
      const res = await client.label.list();
      return res.labels;
    },
  });

  const { data: allTasksForCounts = [] } = useQuery({
    queryKey: ["tasks", "forLabelCounts"],
    queryFn: async () => {
      const res = await client.task.list({
        includeStatuses: ["open", "done", "archived"],
      });
      return res.tasks;
    },
  });

  const labelTaskCounts = new Map<number, number>();
  for (const task of allTasksForCounts) {
    for (const { label } of task.taskLabels) {
      labelTaskCounts.set(label.id, (labelTaskCounts.get(label.id) ?? 0) + 1);
    }
  }

  const createLabelMutation = useMutation({
    mutationFn: (name: string) => client.label.create({ name }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["labels"] }),
    // Back in the field, so it can be sent again.
    onError: (_error, name) => setNewName(name),
  });

  const deleteLabelMutation = useMutation({
    mutationFn: (id: number) => client.label.delete({ id }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["labels"] });
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function create() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createLabelMutation.mutate(trimmed);
    setNewName("");
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader
          size={64}
          label={t("loading")}
          className="animate-delayed-show opacity-0"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-display text-foreground">{t("labels.title")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {labels.length === 1
            ? t("labels.countSingular", { count: labels.length })
            : t("labels.countPlural", { count: labels.length })}
        </p>
      </header>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <TextField
          label={t("labels.newLabel")}
          value={newName}
          onChange={setNewName}
          placeholder={t("labels.newPlaceholder")}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="secondary" isDisabled={!newName.trim()}>
          <Plus aria-hidden />
          {t("labels.add")}
        </Button>
      </form>

      {(createLabelMutation.isError || deleteLabelMutation.isError) && (
        <p role="alert" className="text-destructive text-sm">
          {createLabelMutation.isError
            ? t("labels.createError")
            : t("labels.deleteError")}
        </p>
      )}

      {labels.length === 0 ? (
        <div className="border-border rounded-lg border border-dashed px-4 py-8 text-center">
          <p className="text-foreground text-body">{t("labels.empty")}</p>
        </div>
      ) : (
        <ul className="border-border bg-card divide-border divide-y rounded-lg border shadow-sm">
          {labels.map((label) => (
            <li
              key={label.id}
              className="flex min-h-12 items-center gap-3 py-1.5 pr-1.5 pl-4"
            >
              <Tag aria-hidden className="text-muted-foreground size-4" />
              <span className="text-body text-foreground min-w-0 flex-1 [overflow-wrap:anywhere]">
                {label.name}
              </span>
              <span className="text-muted-foreground shrink-0 text-sm">
                {t("labels.tasks", {
                  count: labelTaskCounts.get(label.id) ?? 0,
                })}
              </span>
              <Button
                variant="quiet"
                size="sm"
                onPress={() => {
                  setToDelete(label);
                  setDeleteOpen(true);
                }}
                aria-label={t("labels.deleteNamed", { name: label.name })}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog
          variant="destructive"
          title={t("labels.deleteDialogTitle")}
          actionLabel={t("labels.delete")}
          cancelLabel={t("common.cancel")}
          onAction={() => {
            if (toDelete) deleteLabelMutation.mutate(toDelete.id);
          }}
        >
          {t("labels.deleteDialogText", { name: toDelete?.name ?? "" })}
        </AlertDialog>
      </Modal>
    </div>
  );
}

export const Route = createFileRoute("/labels")({ component: LabelsPage });
